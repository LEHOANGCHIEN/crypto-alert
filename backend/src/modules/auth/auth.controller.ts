import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AppError } from '../../common/app-error';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Env } from '../../config/env';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

const COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** API.md §1: HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=7 days; Secure when COOKIE_SECURE. */
  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', path: '/api/v1/auth', secure: this.config.get('COOKIE_SECURE', { infer: true }) };
  }

  private setCookie(res: Response, token: string): void {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    res.cookie(COOKIE, token, { ...this.cookieOptions(), maxAge: days * 86_400_000 });
  }

  private clearCookie(res: Response): void {
    res.clearCookie(COOKIE, this.cookieOptions());
  }

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { result, refreshToken } = await this.auth.register(dto);
    this.setCookie(res, refreshToken);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { result, refreshToken } = await this.auth.login(dto);
    this.setCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { result, refreshToken } = await this.auth.refresh(req.cookies?.[COOKIE]);
      this.setCookie(res, refreshToken);
      return result;
    } catch (e) {
      if (e instanceof AppError && e.code === 'REFRESH_TOKEN_INVALID') this.clearCookie(res);
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<null> {
    await this.auth.logout(req.cookies?.[COOKIE]);
    this.clearCookie(res);
    return null;
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() u: AuthUser, @Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(u.id, req.cookies?.[COOKIE], dto);
  }
}
