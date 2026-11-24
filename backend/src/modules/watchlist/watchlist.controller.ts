import { Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WatchlistSymbolParamDto } from './dto/watchlist.dto';
import { WatchlistService } from './watchlist.service';

/** API.md §3.4 (user). */
@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.watchlist.list(u.id);
  }

  @Put(':symbol')
  add(@CurrentUser() u: AuthUser, @Param() p: WatchlistSymbolParamDto) {
    return this.watchlist.add(u.id, p.symbol);
  }

  @Delete(':symbol')
  remove(@CurrentUser() u: AuthUser, @Param() p: WatchlistSymbolParamDto) {
    return this.watchlist.remove(u.id, p.symbol);
  }
}
