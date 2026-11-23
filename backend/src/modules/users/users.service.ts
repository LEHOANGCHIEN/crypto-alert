import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserMe, userPublicSelect } from './user-select';
import type { UpdateSettingsDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userPublicSelect });
    if (!user) throw new AppError('UNAUTHENTICATED');
    return toUserMe(user);
  }

  async updateProfile(id: number, displayName: string) {
    await this.me(id);
    const user = await this.prisma.user.update({ where: { id }, data: { displayName }, select: userPublicSelect });
    return toUserMe(user);
  }

  async updateSettings(id: number, dto: UpdateSettingsDto) {
    const data = {
      ...(dto.locale && { locale: dto.locale }),
      ...(dto.theme && { theme: dto.theme }),
      ...(dto.timezone && { timezone: dto.timezone }),
    };
    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', [{ field: 'settings', code: 'REQUIRED' }]);
    await this.me(id);
    const s = await this.prisma.userSettings.upsert({
      where: { userId: id },
      update: data,
      create: { userId: id, ...data },
      select: { locale: true, theme: true, timezone: true },
    });
    return s;
  }
}
