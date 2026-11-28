import { test, expect } from '@playwright/test';
import { resetApp } from '../../helpers/reset';
import { closeCandle, left, openLiveChart, pinOpenCandle, pushTick, upstreamDisconnect, upstreamStreams, viPrice } from '../../helpers/market';

test.beforeEach(async ({ request }) => resetApp(request));

const TICKER_STREAM = '!miniTicker@arr';

test('AC-RT-01 open candle updates live', async ({ page, request }) => {
  await pinOpenCandle(request, 'BTCUSDT');
  const candles = await openLiveChart(page, '/chart/BTCUSDT?tf=1m', 'BTCUSDT:1m');
  const last = candles[candles.length - 1];
  expect(last.isClosed).toBe(false);
  const root = page.getByTestId('chart-root');
  const price = Math.round((last.high + 500) * 100) / 100; // new high, so close, high and low are all checked

  const deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(root).toHaveAttribute('data-last-close', String(price), { timeout: left(deadline) });
  await expect(page.getByTestId('legend-close')).toHaveText(viPrice(price), { timeout: left(deadline) });
  await expect(page.getByTestId('legend-high')).toHaveText(viPrice(price), { timeout: left(deadline) });
  await expect(page.getByTestId('legend-low')).toHaveText(viPrice(last.low), { timeout: left(deadline) });
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(price), { timeout: left(deadline) });
  // Same candle updated in place: no new candle, same open time.
  await expect(root).toHaveAttribute('data-candle-count', String(candles.length));
  await expect(root).toHaveAttribute('data-last-open-time', String(last.openTime));
});

test('AC-RT-02 closed candle starts a new one', async ({ page, request }) => {
  await pinOpenCandle(request, 'BTCUSDT');
  const candles = await openLiveChart(page, '/chart/BTCUSDT?tf=1m', 'BTCUSDT:1m');
  const root = page.getByTestId('chart-root');

  const deadline = Date.now() + 2_000;
  const { closed, opened } = await closeCandle(request, 'BTCUSDT', '1m');
  expect(closed.openTime).toBe(candles[candles.length - 1].openTime);
  await expect(root).toHaveAttribute('data-candle-count', String(candles.length + 1), { timeout: left(deadline) });
  await expect(root).toHaveAttribute('data-last-open-time', String(opened.openTime), { timeout: left(deadline) });
  // The previous candle keeps its final values; the new one starts at the previous close.
  await expect(root).toHaveAttribute('data-prev-candle', [closed.open, closed.high, closed.low, closed.close].join(','), { timeout: left(deadline) });
  await expect(root).toHaveAttribute('data-last-close', String(closed.close), { timeout: left(deadline) });
  await expect(page.getByTestId('legend-open')).toHaveText(viPrice(closed.close), { timeout: left(deadline) });
});

test('AC-RT-03 subscriptions follow the viewed chart', async ({ page, request }) => {
  await openLiveChart(page, '/chart/BTCUSDT', 'BTCUSDT:1h');
  await page.getByTestId('tf-15m').click();
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'BTCUSDT:15m');
  await page.getByTestId('market-row-ETHUSDT').click();
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-live', 'ETHUSDT:15m');

  // Old streams are dropped 5 s after their room empties (API.md §3.8 note), so poll a little longer than that.
  await expect.poll(() => upstreamStreams(request), { timeout: 12_000 }).toEqual([TICKER_STREAM, 'ethusdt@kline_15m']);
});

test('AC-RT-04 shared upstream subscription ref-count', async ({ context, request }) => {
  const tab1 = await context.newPage();
  const tab2 = await context.newPage();
  await openLiveChart(tab1, '/chart/BTCUSDT', 'BTCUSDT:1h');
  await openLiveChart(tab2, '/chart/BTCUSDT', 'BTCUSDT:1h');
  const one = [TICKER_STREAM, 'btcusdt@kline_1h'];
  expect(await upstreamStreams(request)).toEqual(one);

  // Close one tab: the stream must stay, also after the 5 s grace period has passed.
  await tab1.close();
  const closedAt = Date.now();
  const samples: string[][] = [];
  await expect
    .poll(
      async () => {
        samples.push(await upstreamStreams(request));
        return Date.now() - closedAt;
      },
      { timeout: 12_000, intervals: [500] },
    )
    .toBeGreaterThan(7_000);
  expect(samples.length).toBeGreaterThan(5);
  for (const s of samples) expect(s).toEqual(one);

  // Close both: back to only the all-market ticker stream within 10 s.
  await tab2.close();
  await expect.poll(() => upstreamStreams(request), { timeout: 10_000 }).toEqual([TICKER_STREAM]);
});

test('AC-RT-05 browser reconnect banner and resync', async ({ page, context, request }) => {
  const candles = await openLiveChart(page, '/chart/BTCUSDT', 'BTCUSDT:1h');
  const root = page.getByTestId('chart-root');
  const banner = page.getByTestId('conn-banner');
  await expect(banner).toBeHidden();

  await context.setOffline(true);
  await expect(banner).toBeVisible({ timeout: 5_000 });
  await expect(banner).toHaveText('Mất kết nối, đang kết nối lại…');
  await expect(root).toHaveAttribute('data-live', '');

  // A candle closes while the browser is offline: the chart must get it after reconnecting.
  const { closed, opened } = await closeCandle(request, 'BTCUSDT', '1h');
  expect(closed.openTime).toBe(candles[candles.length - 1].openTime);

  const refetch = page.waitForResponse((r) => /\/api\/v1\/market\/klines\?symbol=BTCUSDT&interval=1h/.test(r.url()));
  await context.setOffline(false);
  await refetch;
  await expect(banner).toBeHidden({ timeout: 5_000 });
  await expect(root).toHaveAttribute('data-last-open-time', String(opened.openTime));
  await expect(root).toHaveAttribute('data-prev-candle', [closed.open, closed.high, closed.low, closed.close].join(','));

  // Live updates resume.
  await expect(root).toHaveAttribute('data-live', 'BTCUSDT:1h');
  const price = Math.round((opened.close + 123) * 100) / 100;
  const deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(root).toHaveAttribute('data-last-close', String(price), { timeout: left(deadline) });
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(price), { timeout: left(deadline) });
});

test('AC-RT-06 upstream disconnect badge and recovery', async ({ page, request }) => {
  await pinOpenCandle(request, 'BTCUSDT');
  await openLiveChart(page, '/chart/BTCUSDT?tf=1m', 'BTCUSDT:1m');
  const badge = page.getByTestId('market-status-badge');
  await expect(badge).toBeHidden();

  await upstreamDisconnect(request, 3_000);
  await expect(badge).toBeVisible({ timeout: 5_000 });
  await expect(badge).toHaveText('Dữ liệu thị trường bị trễ');
  // Our own socket stays up: only the upstream feed is delayed.
  await expect(page.getByTestId('conn-banner')).toBeHidden();

  // The mock recovers after 3 s → the badge goes away without any user action.
  await expect(badge).toBeHidden({ timeout: 10_000 });

  const price = 12_345.67;
  const deadline = Date.now() + 2_000;
  await pushTick(request, 'BTCUSDT', price);
  await expect(page.getByTestId('chart-root')).toHaveAttribute('data-last-close', String(price), { timeout: left(deadline) });
  await expect(page.getByTestId('chart-price')).toHaveText(viPrice(price), { timeout: left(deadline) });
});
