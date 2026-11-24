import { RequiredEnum, SymbolField } from '../../../common/validators';
import { INTERVALS } from '../../market/dto/klines-query.dto';
import type { Interval } from '../../market/market.types';

/** Payload of `kline:subscribe` / `kline:unsubscribe` (API.md §4.2). */
export class KlineSubscriptionDto {
  @SymbolField() symbol!: string;
  @RequiredEnum(INTERVALS) interval!: Interval;
}

/** Payload of `tickers:subscribe` / `tickers:unsubscribe`: `{}` (no fields allowed). */
export class EmptyPayloadDto {}
