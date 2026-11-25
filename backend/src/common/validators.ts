import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min, MinLength, registerDecorator } from 'class-validator';

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

/** Number of decimal places of a finite number, also for exponent notation (1e-9 → 9). */
export function decimalPlaces(v: number): number {
  if (!Number.isFinite(v)) return Number.POSITIVE_INFINITY;
  const [mantissa, exp] = v.toString().toLowerCase().split('e');
  const frac = (mantissa.split('.')[1] ?? '').length;
  return Math.max(0, frac - Number(exp ?? 0));
}

/** Largest accepted price: DECIMAL(24,8) holds 16 integer digits (docs/DATABASE.md). */
export const MAX_PRICE = 1e15;

/** Required positive price: REQUIRED → INVALID_TYPE → OUT_OF_RANGE (≤ 0 or > MAX_PRICE) → TOO_MANY_DECIMALS (> 8). */
export const PriceField = () =>
  applyDecorators(
    // class-validator checks IsDefined first, then the others in the order listed here (stopAtFirstError).
    IsDefined(),
    IsNumber({ allowNaN: false, allowInfinity: false }),
    IsPositive({ context: { code: 'OUT_OF_RANGE' } }),
    Max(MAX_PRICE, { context: { code: 'OUT_OF_RANGE', params: { max: MAX_PRICE } } }),
    registerMaxDecimals(8),
  );

function registerMaxDecimals(max: number): PropertyDecorator {
  return (target: object, property: string | symbol) =>
    registerDecorator({
      name: 'maxDecimals',
      target: target.constructor,
      propertyName: String(property),
      constraints: [max],
      options: { context: { code: 'TOO_MANY_DECIMALS' } },
      // Non-numbers are reported by IsNumber (INVALID_TYPE); this check only judges numbers.
      validator: { validate: (v: unknown) => typeof v !== 'number' || decimalPlaces(v) <= max },
    });
}

/** Required integer path param (e.g. `/alerts/:id`); non-integers → VALIDATION_ERROR. */
export const IntParam = () =>
  applyDecorators(
    IsDefined(),
    IsInt(),
    Min(1, { context: { code: 'OUT_OF_RANGE', params: { min: 1 } } }),
    Max(2_147_483_647, { context: { code: 'OUT_OF_RANGE', params: { max: 2_147_483_647 } } }),
    Transform(({ value }) => (typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value)),
  );
