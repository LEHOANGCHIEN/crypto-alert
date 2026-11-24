import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PriceBus } from '../market/price-bus';
import { ROOMS, SERVER_EVENTS } from './events';
import { RealtimeService } from './realtime.service';
import { TickerBatcher } from './ticker-batcher';

/**
 * PriceBus → Socket.IO (ARCHITECTURE §3.1–3.2, §4 "Status"): batched `tickers:update` to room `tickers`,
 * `kline:update` to `kline:{SYMBOL}:{interval}`, `market:status` to every socket.
 */
@Injectable()
export class RealtimeRelay implements OnModuleInit, OnApplicationShutdown {
  private readonly batcher: TickerBatcher;
  private readonly off: (() => void)[] = [];

  constructor(
    private readonly bus: PriceBus,
    private readonly realtime: RealtimeService,
  ) {
    this.batcher = new TickerBatcher((tickers) => this.realtime.emitToRoom(ROOMS.TICKERS, SERVER_EVENTS.TICKERS_UPDATE, { tickers }));
  }

  onModuleInit(): void {
    this.off.push(
      this.bus.on('ticker', (t) => this.batcher.add(t)),
      this.bus.on('kline', ({ symbol, interval, candle }) =>
        this.realtime.emitToRoom(ROOMS.kline(symbol, interval), SERVER_EVENTS.KLINE_UPDATE, { symbol, interval, candle }),
      ),
      this.bus.on('status', (s) => this.realtime.broadcast(SERVER_EVENTS.MARKET_STATUS, { status: s.status, at: s.at })),
    );
  }

  onApplicationShutdown(): void {
    for (const off of this.off.splice(0)) off();
    this.batcher.reset();
  }

  /** Test support: forget batched / last sent tickers. */
  reset(): void {
    this.batcher.reset();
  }
}
