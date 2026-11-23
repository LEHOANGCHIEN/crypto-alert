import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../common/app-error';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

/** DATABASE.md §2 refresh_tokens: a token rotated less than this long ago is not "reuse" (multi-tab). */
export const REUSE_GRACE_MS = 10_000;

export const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async create(userId: number): Promise<{ raw: string; id: number }> {
    const raw = randomBytes(32).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const row = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + days * 86_400_000) },
    });
    return { raw, id: row.id };
  }

  issue(userId: number) {
    return this.create(userId);
  }

  /** Rotation with reuse detection. Returns the user and the new raw token. */
  async rotate(raw: string | undefined): Promise<{ userId: number; raw: string }> {
    if (!raw) throw new AppError('REFRESH_TOKEN_INVALID');
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
    if (!row || row.expiresAt.getTime() <= Date.now()) throw new AppError('REFRESH_TOKEN_INVALID');

    if (!row.revokedAt) {
      const next = await this.create(row.userId);
      // Atomic claim: only one of two concurrent refreshes wins the rotation.
      const claimed = await this.prisma.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedById: next.id },
      });
      if (claimed.count === 1) return { userId: row.userId, raw: next.raw };
      await this.prisma.refreshToken.delete({ where: { id: next.id } });
      return this.handleRevoked(row.id);
    }
    return this.handleRevoked(row.id);
  }

  private async handleRevoked(id: number): Promise<{ userId: number; raw: string }> {
    const row = await this.prisma.refreshToken.findUniqueOrThrow({ where: { id } });
    const rotatedRecently =
      row.replacedById !== null && row.revokedAt !== null && Date.now() - row.revokedAt.getTime() < REUSE_GRACE_MS;
    if (rotatedRecently) {
      const next = await this.create(row.userId);
      return { userId: row.userId, raw: next.raw };
    }
    await this.revokeAll(row.userId);
    throw new AppError('REFRESH_TOKEN_INVALID');
  }

  async revoke(raw: string | undefined): Promise<void> {
    if (!raw) return;
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Change password: every session except the current one is logged out. */
  async revokeOthers(userId: number, currentRaw: string | undefined): Promise<void> {
    const current = currentRaw ? hashToken(currentRaw) : undefined;
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(current ? { tokenHash: { not: current } } : {}) },
      data: { revokedAt: new Date() },
    });
  }
}
