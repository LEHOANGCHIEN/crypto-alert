import { Controller, Get } from '@nestjs/common';
import { SymbolRegistry } from './symbol-registry';
import { TickerStore } from './ticker-store';

/** API.md §3.3 (public). */
@Controller('market')
export class MarketController {
  constructor(
    private readonly symbols: SymbolRegistry,
    private readonly tickers: TickerStore,
  ) {}

  @Get('symbols')
  listSymbols() {
    return this.symbols.list();
  }

  @Get('tickers')
  listTickers() {
    return this.tickers.list();
  }
}
