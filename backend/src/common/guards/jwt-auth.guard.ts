import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppError } from '../app-error';
import type { AuthUser } from '../decorators/current-user.decorator';

/** Requires `Authorization: Bearer <accessToken>`; expired → TOKEN_EXPIRED, anything else → UNAUTHENTICATED. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError('UNAUTHENTICATED');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role: 'user' | 'admin' }>(token);
      if (!Number.isInteger(payload.sub)) throw new AppError('UNAUTHENTICATED');
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e instanceof TokenExpiredError) throw new AppError('TOKEN_EXPIRED');
      throw new AppError('UNAUTHENTICATED');
    }
  }
}
