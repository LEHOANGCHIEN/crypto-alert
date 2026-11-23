import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppError } from './app-error';
import { FieldError, FieldErrorCode } from './error-codes';

const CONSTRAINT_TO_CODE: Record<string, FieldErrorCode> = {
  isNotEmpty: 'REQUIRED',
  isDefined: 'REQUIRED',
  isString: 'INVALID_TYPE',
  isNumber: 'INVALID_TYPE',
  isInt: 'INVALID_TYPE',
  isBoolean: 'INVALID_TYPE',
  isEmail: 'INVALID_EMAIL',
  matches: 'INVALID_TYPE',
  isTimezone: 'INVALID_TIMEZONE',
  minLength: 'TOO_SHORT',
  maxLength: 'TOO_LONG',
  min: 'OUT_OF_RANGE',
  max: 'OUT_OF_RANGE',
  isPositive: 'OUT_OF_RANGE',
  isIn: 'INVALID_ENUM',
  isEnum: 'INVALID_ENUM',
  whitelistValidation: 'UNKNOWN_FIELD',
};

/**
 * Flatten class-validator errors into API.md field errors.
 * A decorator may override the mapping with `{ context: { code, params } }`.
 */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    for (const key of Object.keys(err.constraints ?? {})) {
      const ctx = err.contexts?.[key] as { code?: FieldErrorCode; params?: FieldError['params'] } | undefined;
      const code = ctx?.code ?? CONSTRAINT_TO_CODE[key] ?? 'INVALID_TYPE';
      const item: FieldError = { field, code };
      if (ctx?.params) item.params = ctx.params;
      out.push(item);
    }
    if (err.children?.length) out.push(...flattenValidationErrors(err.children, field));
  }
  return out;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) => new AppError('VALIDATION_ERROR', flattenValidationErrors(errors)),
  });
}
