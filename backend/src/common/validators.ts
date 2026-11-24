import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, registerDecorator } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Decorators run bottom-up with stopAtFirstError, so the order below is: required → type → rules. */
export const TextField = (min: number, max: number) =>
  applyDecorators(
    MaxLength(max, { context: { code: 'TOO_LONG', params: { max } } }),
    MinLength(min, { context: { code: 'TOO_SHORT', params: { min } } }),
    IsString(),
    IsNotEmpty(),
    IsDefined(),
    Transform(trim),
  );

export const EmailField = () =>
  applyDecorators(
    Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { context: { code: 'INVALID_EMAIL' } }),
    MaxLength(254, { context: { code: 'TOO_LONG', params: { max: 254 } } }),
    IsString(),
    IsNotEmpty(),
    IsDefined(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
  );

/** 8–72 chars, ≥ 1 letter and ≥ 1 digit (SPEC §4). Not trimmed. */
export const PasswordField = () =>
  applyDecorators(
    Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { context: { code: 'PASSWORD_WEAK' } }),
    MaxLength(72, { context: { code: 'TOO_LONG', params: { max: 72 } } }),
    MinLength(8, { context: { code: 'TOO_SHORT', params: { min: 8 } } }),
    IsString(),
    IsNotEmpty(),
    IsDefined(),
  );

export const OptionalEnum = (values: readonly string[]) =>
  applyDecorators(IsIn(values as string[], { context: { code: 'INVALID_ENUM' } }), IsString(), IsOptional());

/** Upper-cased symbol, format `^[A-Z0-9]{2,20}$` (API.md §1). */
export const SymbolField = () =>
  applyDecorators(
    IsDefined(),
    IsNotEmpty(),
    IsString(),
    Matches(/^[A-Z0-9]{2,20}$/, { context: { code: 'INVALID_SYMBOL_FORMAT' } }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
  );

export const RequiredEnum = (values: readonly string[]) =>
  applyDecorators(IsDefined(), IsNotEmpty(), IsString(), IsIn(values as string[], { context: { code: 'INVALID_ENUM' } }));

/** Optional integer in [min, max]; accepts numeric query strings ("500"). */
export const OptionalIntRange = (min: number, max: number) =>
  applyDecorators(
    IsOptional(),
    IsInt(),
    Min(min, { context: { code: 'OUT_OF_RANGE', params: { min, max } } }),
    Max(max, { context: { code: 'OUT_OF_RANGE', params: { min, max } } }),
    Transform(({ value }) => (typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value)),
  );

/** Any IANA name the runtime knows, including aliases such as Asia/Ho_Chi_Minh and UTC. */
export function isValidTimezone(v: unknown): boolean {
  if (typeof v !== 'string' || v.length < 1 || v.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

export function IsTimezone() {
  return (target: object, property: string) => {
    registerDecorator({
      name: 'isTimezone',
      target: target.constructor,
      propertyName: property,
      constraints: [],
      options: { context: { code: 'INVALID_TIMEZONE' } },
      validator: { validate: isValidTimezone },
    });
    IsString()(target, property);
    IsOptional()(target, property);
  };
}
