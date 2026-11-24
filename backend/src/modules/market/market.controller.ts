import { Controller, Get, Query } from '@nestjs/common';
import { CandleCacheService } from './candle-cache.service';
import { KlinesQueryDto } from './dto/klines-query.dto';
import { SymbolRegistry } from './symbol-registry';
import { TickerStore } from './ticker-store';

/** API.md §3.3 (public). */
@Controller('market')
export class MarketController {
  constructor(
    private readonly symbols: SymbolRegistry,
    private readonly tickers: TickerStore,
    private readonly candles: CandleCacheService,
  ) {}

  @Get('symbols')
  listSymbols() {
    return this.symbols.list();
  }

  @Get('tickers')
  listTickers() {
    return this.tickers.list();
  }

  @Get('klines')
  klines(@Query() q: KlinesQueryDto) {
    return this.candles.getKlines(q.symbol, q.interval, q.limit ?? 1000);
  }
}
