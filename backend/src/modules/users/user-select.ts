import type { Prisma } from '@prisma/client';

/** The only user shape ever returned to clients: never passwordHash (CLAUDE.md). */
export const userPublicSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  settings: { select: { locale: true, theme: true, timezone: true } },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

export function toUserMe(u: Row) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
    settings: u.settings ?? { locale: 'vi' as const, theme: 'dark' as const, timezone: 'Asia/Ho_Chi_Minh' },
  };
}
