import * as argon2 from 'argon2';
import type { PrismaClient } from '@prisma/client';

export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'Demo@123456';

/** Idempotent demo data (docs/DATABASE.md §6). Touches only the demo user's rows. */
export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, displayName: 'Demo User', role: 'user' },
    create: { email: DEMO_EMAIL, passwordHash, displayName: 'Demo User', role: 'user' },
  });
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: { locale: 'vi', theme: 'dark', timezone: 'Asia/Ho_Chi_Minh' },
    create: { userId: user.id, locale: 'vi', theme: 'dark', timezone: 'Asia/Ho_Chi_Minh' },
  });

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.alert.deleteMany({ where: { userId: user.id } });
    await tx.watchlistItem.deleteMany({ where: { userId: user.id } });

    const base = Date.now();
    for (const [i, symbol] of ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].entries()) {
      await tx.watchlistItem.create({ data: { userId: user.id, symbol, createdAt: new Date(base + i) } });
    }
    await tx.alert.create({ data: { userId: user.id, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 1000000 } });
    await tx.alert.create({ data: { userId: user.id, symbol: 'ETHUSDT', condition: 'BELOW', targetPrice: 100 } });
    const triggeredAt = new Date(base - 60 * 60 * 1000);
    const triggered = await tx.alert.create({
      data: {
        userId: user.id,
        symbol: 'SOLUSDT',
        condition: 'ABOVE',
        targetPrice: 100,
        status: 'TRIGGERED',
        triggeredPrice: 101.5,
        triggeredAt,
      },
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        alertId: triggered.id,
        type: 'ALERT_TRIGGERED',
        payload: { alertId: triggered.id, symbol: 'SOLUSDT', condition: 'ABOVE', targetPrice: 100, triggeredPrice: 101.5 },
        createdAt: triggeredAt,
      },
    });
  });
}
