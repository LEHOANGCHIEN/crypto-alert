import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppError } from '../../common/app-error';

/** One shared bucket per client IP for register + login (API.md §3.1). */
@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  protected generateKey(_context: ExecutionContext, tracker: string, name: string): string {
    return `auth:${name}:${tracker}`;
  }

  protected async throwThrottlingException(context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Retry-After', String(Math.max(1, detail.timeToBlockExpire || detail.timeToExpire)));
    throw new AppError('RATE_LIMITED');
  }
}
