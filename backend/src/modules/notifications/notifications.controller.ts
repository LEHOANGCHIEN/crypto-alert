import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ListNotificationsQueryDto, NotificationIdParamDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

/** API.md §3.6 (user). */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListNotificationsQueryDto) {
    return this.notifications.list(u.id, q.limit);
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: AuthUser) {
    return this.notifications.markAllRead(u.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() u: AuthUser, @Param() p: NotificationIdParamDto) {
    return this.notifications.markRead(u.id, p.id);
  }
}
