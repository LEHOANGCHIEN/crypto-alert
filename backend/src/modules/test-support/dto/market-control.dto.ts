import { IsDefined, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { RequiredEnum, SymbolField } from '../../../common/validators';
import { INTERVALS } from '../../market/dto/klines-query.dto';
import type { Interval } from '../../market/market.types';

/** POST /test/market/tick (API.md §3.8). */
export class TickDto {
  @SymbolField() symbol!: string;
  @IsPositive({ context: { code: 'OUT_OF_RANGE' } }) @IsNumber() @IsDefined() price!: number;
  @IsPositive({ context: { code: 'OUT_OF_RANGE' } }) @IsNumber() @IsOptional() quoteVolume?: number;
}

/** POST /test/market/close-candle */
export class CloseCandleDto {
  @SymbolField() symbol!: string;
  @RequiredEnum(INTERVALS) interval!: Interval;
}

/** POST /test/market/disconnect */
export class DisconnectDto {
  @Max(60_000, { context: { code: 'OUT_OF_RANGE', params: { min: 1, max: 60_000 } } })
  @Min(1, { context: { code: 'OUT_OF_RANGE', params: { min: 1, max: 60_000 } } })
  @IsInt()
  @IsOptional()
  durationMs?: number;
}
