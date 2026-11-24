import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = { id: number; role: 'user' | 'admin' };

/** The authenticated user set by JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
