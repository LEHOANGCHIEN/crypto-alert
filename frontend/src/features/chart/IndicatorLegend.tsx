import { useTranslation } from 'react-i18next';
import { useFormat } from '../../shared/format/useFormat';
import { MACD_FAST, MACD_SIGNAL, MACD_SLOW, RSI_PERIOD, type IndicatorData, type IndicatorSettings } from '../indicators';

const MA_CLASS = ['text-ind-1', 'text-ind-2', 'text-ind-3'];
const RSI_DECIMALS = 2;

/** Indicator values of candle `index` (hovered or latest): MA row, RSI row, MACD row. */
export function IndicatorLegend({
  data,
  index,
  settings,
  precision,
}: {
  data: IndicatorData;
  index: number;
  settings: IndicatorSettings;
  precision: number;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const value = (v: number | null | undefined, decimals: number) => (v === null || v === undefined ? '—' : fmt.price(v, decimals));
  const anyMa = settings.ma.some((m) => m.enabled);
  const hist = data.hist[index];

  return (
    <>
      {anyMa && (
        <div className="flex flex-wrap gap-x-3">
          {settings.ma.map((m, i) =>
            m.enabled ? (
              <span key={i} data-testid={`legend-ma-${i + 1}`} className={MA_CLASS[i]}>
                <span data-testid={`legend-ma-${i + 1}-label`}>{t('indicators.legend.ma', { period: m.period })}</span>{' '}
                <span data-testid={`legend-ma-${i + 1}-value`}>{value(data.ma[i]?.[index], precision)}</span>
              </span>
            ) : null,
          )}
        </div>
      )}
      {settings.rsi && (
        <div data-testid="legend-rsi" className="text-ind-rsi">
          <span>{t('indicators.legend.rsi', { period: RSI_PERIOD })}</span> <span data-testid="legend-rsi-value">{value(data.rsi[index], RSI_DECIMALS)}</span>
        </div>
      )}
      {settings.macd && (
        <div data-testid="legend-macd" className="flex flex-wrap gap-x-3">
          <span className="text-text-muted">{t('indicators.legend.macd', { fast: MACD_FAST, slow: MACD_SLOW, signal: MACD_SIGNAL })}</span>
          <span className="text-ind-macd">
            <span className="text-text-muted">{t('indicators.legend.line')} </span>
            <span data-testid="legend-macd-value">{value(data.macd[index], precision)}</span>
          </span>
          <span className="text-ind-signal">
            <span className="text-text-muted">{t('indicators.legend.signal')} </span>
            <span data-testid="legend-macd-signal-value">{value(data.signal[index], precision)}</span>
          </span>
          <span className={hist === null || hist === undefined ? 'text-text-muted' : hist >= 0 ? 'text-up' : 'text-down'}>
            <span className="text-text-muted">{t('indicators.legend.hist')} </span>
            <span data-testid="legend-macd-hist-value" data-sign={hist === null || hist === undefined ? '' : hist >= 0 ? 'up' : 'down'}>
              {value(hist, precision)}
            </span>
          </span>
        </div>
      )}
    </>
  );
}
