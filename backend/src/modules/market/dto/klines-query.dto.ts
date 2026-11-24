import { OptionalIntRange, RequiredEnum, SymbolField } from '../../../common/validators';
import type { Interval } from '../market.types';

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

export class KlinesQueryDto {
  @SymbolField() symbol!: string;
  @RequiredEnum(INTERVALS) interval!: Interval;
  @OptionalIntRange(1, 1000) limit?: number;
}
