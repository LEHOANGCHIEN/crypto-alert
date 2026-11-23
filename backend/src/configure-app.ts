import { INestApplication, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { EnvelopeInterceptor } from './common/envelope.interceptor';
import { createValidationPipe } from './common/validation';
import type { Env } from './config/env';

const LOG_LEVELS: Record<Env['LOG_LEVEL'], LogLevel[]> = {
  error: ['error', 'fatal'],
  warn: ['error', 'fatal', 'warn'],
  info: ['error', 'fatal', 'warn', 'log'],
  debug: ['error', 'fatal', 'warn', 'log', 'debug'],
};

/** Shared by main.ts and integration tests so both run the exact same pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const nest = app as NestExpressApplication;

  nest.useLogger(LOG_LEVELS[config.get('LOG_LEVEL', { infer: true })]);
  const hops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (hops > 0) nest.set('trust proxy', hops);
  nest.disable('x-powered-by');

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get('SERVE_FRONTEND', { infer: true })) serveFrontend(nest, config.get('FRONTEND_DIST_PATH', { infer: true }));
}

/** Built SPA + fallback to index.html for client-side routes (never for /api or /socket.io). */
function serveFrontend(app: NestExpressApplication, distPath: string): void {
  const dist = resolve(process.cwd(), distPath);
  const index = resolve(dist, 'index.html');
  if (!existsSync(index)) throw new Error(`SERVE_FRONTEND=true but ${index} does not exist (run the frontend build)`);
  app.use(express.static(dist, { index: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(index);
  });
}
