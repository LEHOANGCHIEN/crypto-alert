import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { Candle, Interval, MarketStatus, Ticker } from './market.types';

type Events = {
  ticker: [Ticker];
  kline: [{ symbol: string; interval: Interval; candle: Candle }];
  status: [{ status: MarketStatus; at: number }];
};

/** In-process event bus: decouples the provider from consumers (ARCHITECTURE §2). */
@Injectable()
export class PriceBus {
  private readonly emitter = new EventEmitter();

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.emitter.emit(event, ...args);
  }

  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    this.emitter.on(event, listener as (...a: unknown[]) => void);
    return () => this.emitter.off(event, listener as (...a: unknown[]) => void);
  }
}
