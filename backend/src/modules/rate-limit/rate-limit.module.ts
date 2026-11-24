import { Injectable, Module } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

type Entry = { hits: number; expiresAt: number };

/** Fixed-window in-memory storage with a reset hook for POST /test/reset. */
@Injectable()
export class ResettableThrottlerStorage implements ThrottlerStorage {
  private readonly entries = new Map<string, Entry>();

  async increment(key: string, ttl: number, limit: number) {
    const now = Date.now();
    let e = this.entries.get(key);
    if (!e || e.expiresAt <= now) {
      e = { hits: 0, expiresAt: now + ttl };
      this.entries.set(key, e);
    }
    e.hits += 1;
    const timeToExpire = Math.ceil((e.expiresAt - now) / 1000);
    const isBlocked = e.hits > limit;
    return { totalHits: e.hits, timeToExpire, isBlocked, timeToBlockExpire: isBlocked ? timeToExpire : 0 };
  }

  reset(): void {
    this.entries.clear();
  }
}

@Module({ providers: [ResettableThrottlerStorage], exports: [ResettableThrottlerStorage] })
export class RateLimitModule {}
