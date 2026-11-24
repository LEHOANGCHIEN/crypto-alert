import { SymbolField } from '../../../common/validators';

export class WatchlistSymbolParamDto {
  @SymbolField() symbol!: string;
}
