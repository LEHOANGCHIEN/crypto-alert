import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { serialize } from './serialize';

/** Wraps every successful REST response as { success: true, data } (API.md §1.1). */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => ({ success: true, data: serialize(data ?? null) })));
  }
}
