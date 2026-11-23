import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.users.me(u.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(u.id, dto.displayName);
  }

  @Patch('me/settings')
  updateSettings(@CurrentUser() u: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(u.id, dto);
  }
}
