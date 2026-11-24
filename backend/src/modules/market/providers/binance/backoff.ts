/** Reconnect timing of the upstream WebSocket (ARCHITECTURE §4 "Reconnect"). */
export const BACKOFF_MIN_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;
export const BACKOFF_JITTER = 0.2;
/** A connection that stayed open this long resets the backoff to the minimum. */
export const BACKOFF_HEALTHY_RESET_MS = 60_000;

/**
 * Delay before reconnect attempt `attempt` (0-based): 1 s, 2 s, 4 s … capped at 30 s, then ±20 % jitter.
 * `random` returns [0,1) like Math.random (injected by tests).
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_MIN_MS * 2 ** Math.max(0, attempt), BACKOFF_MAX_MS);
  const factor = 1 + (random() * 2 - 1) * BACKOFF_JITTER;
  return Math.round(base * factor);
}
