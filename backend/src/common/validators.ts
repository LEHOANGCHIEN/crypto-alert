import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDefined, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, registerDecorator } from 'class-validator';

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

const TIMEZONES = new Set<string>([...Intl.supportedValuesOf('timeZone'), 'UTC']);
export function isValidTimezone(v: unknown): boolean {
  return typeof v === 'string' && TIMEZONES.has(v);
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
