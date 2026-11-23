import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from './app-error';
import { ERROR_HTTP_STATUS, ErrorCode } from './error-codes';

export function toErrorCode(exception: unknown): { code: ErrorCode; status: number; details?: AppError['details'] } {
  if (exception instanceof AppError) {
    return { code: exception.code, status: exception.status, details: exception.details };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const byStatus: Record<number, ErrorCode> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };
    const code = byStatus[status];
    if (code) return { code, status: ERROR_HTTP_STATUS[code] };
  }
  return { code: 'INTERNAL_ERROR', status: 500 };
}

/** Converts every exception to { success:false, error:{ code, details? } }. Never leaks messages. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { code, status, details } = toErrorCode(exception);
    if (code === 'INTERNAL_ERROR') {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }
    const error: { code: ErrorCode; details?: unknown } = { code };
    if (details && details.length > 0) error.details = details;
    res.status(status).json({ success: false, error });
  }
}
