import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { AppError } from './app-error';
import { toErrorCode } from './all-exceptions.filter';
import { ERROR_HTTP_STATUS } from './error-codes';
import { serialize } from './serialize';
import { flattenValidationErrors } from './validation';

class Dto {
  @IsEmail({}, { context: { code: 'INVALID_EMAIL' } }) email!: string;
  @IsString() @MinLength(8, { context: { code: 'TOO_SHORT', params: { min: 8 } } }) password!: string;
  @IsNotEmpty() name!: string;
}

describe('error mapping', () => {
  it('AppError keeps code and HTTP status from API.md', () => {
    expect(toErrorCode(new AppError('ALERT_NOT_FOUND'))).toMatchObject({ code: 'ALERT_NOT_FOUND', status: 404 });
    expect(toErrorCode(new AppError('ALERT_CONDITION_ALREADY_MET')).status).toBe(422);
  });
  it('Nest HttpExceptions map to API codes', () => {
    expect(toErrorCode(new NotFoundException()).code).toBe('NOT_FOUND');
    expect(toErrorCode(new BadRequestException()).code).toBe('VALIDATION_ERROR');
    expect(toErrorCode(new HttpException('x', 429)).code).toBe('RATE_LIMITED');
  });
  it('unknown exceptions become INTERNAL_ERROR', () => {
    expect(toErrorCode(new Error('boom'))).toEqual({ code: 'INTERNAL_ERROR', status: 500 });
  });
  it('has all 19 documented codes', () => {
    expect(Object.keys(ERROR_HTTP_STATUS)).toHaveLength(19);
  });
});

describe('validation mapping', () => {
  it('produces field codes with params', async () => {
    const dto = plainToInstance(Dto, { email: 'nope', password: 'abc' });
    const errors = await validate(dto, { whitelist: true });
    const flat = flattenValidationErrors(errors);
    expect(flat).toEqual(
      expect.arrayContaining([
        { field: 'email', code: 'INVALID_EMAIL' },
        { field: 'password', code: 'TOO_SHORT', params: { min: 8 } },
        { field: 'name', code: 'REQUIRED' },
      ]),
    );
  });
  it('maps unknown properties to UNKNOWN_FIELD', async () => {
    const dto = plainToInstance(Dto, { email: 'a@b.co', password: 'abcdefg1', name: 'x', extra: 1 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(flattenValidationErrors(errors)).toEqual([{ field: 'extra', code: 'UNKNOWN_FIELD' }]);
  });
});

describe('serialize', () => {
  it('converts Decimal to number and Date to ISO', () => {
    const out = serialize({ p: new Prisma.Decimal('67234.5'), at: new Date('2026-11-21T07:05:00.000Z'), n: [new Prisma.Decimal(1)] });
    expect(out).toEqual({ p: 67234.5, at: '2026-11-21T07:05:00.000Z', n: [1] });
  });
});
