import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { AlertIdParamDto, CreateAlertDto, ListAlertsQueryDto } from './dto/alerts.dto';

/** API.md §3.5 (user). */
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListAlertsQueryDto) {
    return this.alerts.list(u.id, q.status);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: CreateAlertDto) {
    return this.alerts.create(u.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param() p: AlertIdParamDto) {
    return this.alerts.remove(u.id, p.id);
  }
}
