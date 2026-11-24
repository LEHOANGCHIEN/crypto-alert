import { Inject, Logger } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AppError } from '../../common/app-error';
import { toErrorCode } from '../../common/all-exceptions.filter';
import type { ErrorCode, FieldError } from '../../common/error-codes';
import { createValidationPipe } from '../../common/validation';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from '../market/providers/market-data-provider.interface';
import { SubscriptionManager } from '../market/subscription-manager';
import { SymbolRegistry } from '../market/symbol-registry';
import { EmptyPayloadDto, KlineSubscriptionDto } from './dto/kline-subscription.dto';
import { CLIENT_EVENTS, ROOMS, SERVER_EVENTS } from './events';
import { RealtimeService } from './realtime.service';

/** Socket ack envelope (API.md §1.1). */
export type Ack = { success: true; data: null } | { success: false; error: { code: ErrorCode; details?: FieldError[] } };

type SocketData = { userId?: number };
type AppSocket = Socket & { data: SocketData };

const validationPipe = createValidationPipe();

/** Validates a socket payload with the same rules (and field codes) as REST bodies. */
async function validatePayload<T extends object>(metatype: new () => T, body: unknown): Promise<T> {
  const value: unknown = body ?? {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new AppError('VALIDATION_ERROR');
  return (await validationPipe.transform(value, { type: 'body', metatype })) as T;
}

/**
 * Socket.IO gateway (API.md §4): handshake auth, rooms, subscription acks.
 * Server options follow ARCHITECTURE §4 "Client side" (ping 10 s / timeout 5 s).
 */
@WebSocketGateway({ path: '/socket.io', pingInterval: 10_000, pingTimeout: 5_000, serveClient: false })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    private readonly jwt: JwtService,
    private readonly realtime: RealtimeService,
    private readonly subscriptions: SubscriptionManager,
    private readonly registry: SymbolRegistry,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
  ) {}

  afterInit(server: Server): void {
    // Handshake auth (API.md §4.1): no token → guest; invalid/expired token → connect_error with data.code.
    server.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      if (token === undefined || token === null || token === '') return next();
      if (typeof token !== 'string') return next(this.authError('UNAUTHENTICATED'));
      this.jwt
        .verifyAsync<{ sub: number }>(token)
        .then((payload) => {
          if (!Number.isInteger(payload.sub)) return next(this.authError('UNAUTHENTICATED'));
          (socket.data as SocketData).userId = payload.sub;
          next();
        })
        .catch((e: unknown) => next(this.authError(e instanceof TokenExpiredError ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED')));
    });
    this.realtime.attach(server);
  }

  async handleConnection(socket: AppSocket): Promise<void> {
    const userId = socket.data.userId;
    if (userId !== undefined) await socket.join(ROOMS.user(userId));
    const { connected } = this.provider.getStatus();
    socket.emit(SERVER_EVENTS.MARKET_STATUS, { status: connected ? 'connected' : 'reconnecting', at: Date.now() });
  }

  handleDisconnect(socket: AppSocket): void {
    this.subscriptions.releaseAll(socket.id);
  }

  @SubscribeMessage(CLIENT_EVENTS.TICKERS_SUBSCRIBE)
  tickersSubscribe(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack> {
    return this.ack(async () => {
      await validatePayload(EmptyPayloadDto, body);
      await socket.join(ROOMS.TICKERS);
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.TICKERS_UNSUBSCRIBE)
  tickersUnsubscribe(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack> {
    return this.ack(async () => {
      await validatePayload(EmptyPayloadDto, body);
      await socket.leave(ROOMS.TICKERS);
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.KLINE_SUBSCRIBE)
  klineSubscribe(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack> {
    return this.ack(async () => {
      const { symbol, interval } = await validatePayload(KlineSubscriptionDto, body);
      await this.registry.require(symbol);
      if (socket.disconnected) return; // left while we were checking; nothing to hold
      this.subscriptions.acquire(socket.id, symbol, interval);
      await socket.join(ROOMS.kline(symbol, interval));
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.KLINE_UNSUBSCRIBE)
  klineUnsubscribe(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack> {
    return this.ack(async () => {
      const { symbol, interval } = await validatePayload(KlineSubscriptionDto, body);
      await socket.leave(ROOMS.kline(symbol, interval));
      this.subscriptions.release(socket.id, symbol, interval);
    });
  }

  private async ack(fn: () => Promise<void>): Promise<Ack> {
    try {
      await fn();
      return { success: true, data: null };
    } catch (e) {
      const { code, details } = toErrorCode(e);
      if (code === 'INTERNAL_ERROR') this.logger.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
      return { success: false, error: details?.length ? { code, details } : { code } };
    }
  }

  private authError(code: 'UNAUTHENTICATED' | 'TOKEN_EXPIRED'): Error {
    const err = new Error(code) as Error & { data: { code: string } };
    err.data = { code };
    return err;
  }
}
