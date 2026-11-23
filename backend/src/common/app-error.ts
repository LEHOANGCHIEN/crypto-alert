import { ERROR_HTTP_STATUS, ErrorCode, FieldError } from './error-codes';

/** The only error type services throw. The filter maps it to the API.md envelope. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly details?: FieldError[],
  ) {
    super(code);
    this.status = ERROR_HTTP_STATUS[code];
  }
}
