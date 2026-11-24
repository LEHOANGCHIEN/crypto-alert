import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserMe, userPublicSelect } from '../users/user-select';
import type { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async accessToken(userId: number, role: string) {
    const expiresIn = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    return { accessToken: await this.jwt.signAsync({ sub: userId, role }, { expiresIn }), expiresIn };
  }

  async register(dto: RegisterDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } })) throw new AppError('EMAIL_TAKEN');
    const passwordHash = await this.passwords.hash(dto.password);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          settings: { create: { locale: dto.locale, theme: dto.theme, timezone: dto.timezone } },
        },
        select: userPublicSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('EMAIL_TAKEN');
      throw e;
    }
    const refresh = await this.refreshTokens.issue(user.id);
    return { result: { ...(await this.accessToken(user.id, user.role)), user: toUserMe(user) }, refreshToken: refresh.raw };
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { ...userPublicSelect, passwordHash: true } });
    if (!found) {
      await this.passwords.verifyDummy(dto.password);
      throw new AppError('INVALID_CREDENTIALS');
    }
    const { passwordHash, ...user } = found;
    if (!(await this.passwords.verify(passwordHash, dto.password))) throw new AppError('INVALID_CREDENTIALS');
    const refresh = await this.refreshTokens.issue(user.id);
    return { result: { ...(await this.accessToken(user.id, user.role)), user: toUserMe(user) }, refreshToken: refresh.raw };
  }

  async refresh(rawToken: string | undefined) {
    const { userId, raw } = await this.refreshTokens.rotate(rawToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new AppError('REFRESH_TOKEN_INVALID');
    return { result: await this.accessToken(user.id, user.role), refreshToken: raw };
  }

  logout(rawToken: string | undefined) {
    return this.refreshTokens.revoke(rawToken);
  }

  async changePassword(userId: number, rawToken: string | undefined, dto: ChangePasswordDto): Promise<null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new AppError('UNAUTHENTICATED');
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) throw new AppError('WRONG_CURRENT_PASSWORD');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await this.passwords.hash(dto.newPassword) } });
    await this.refreshTokens.revokeOthers(userId, rawToken);
    return null;
  }
}
