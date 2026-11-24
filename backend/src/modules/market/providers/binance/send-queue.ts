/** Binance allows 5 incoming messages per second per connection; we stay at 4 (ARCHITECTURE §4 "Subscribe"). */
export const MAX_MESSAGES_PER_SECOND = 4;
const WINDOW_MS = 1_000;

/**
 * Outgoing message queue with a sliding one-second window: at most `maxPerSecond` messages are passed to `send`
 * in any 1000 ms; the rest wait (FIFO) for the window to move.
 */
export class SendQueue {
  private queue: string[] = [];
  private sentAt: number[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly send: (message: string) => void,
    private readonly maxPerSecond = MAX_MESSAGES_PER_SECOND,
  ) {}

  push(message: string): void {
    this.queue.push(message);
    this.drain();
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Drop everything not yet sent (connection closed: the resubscribe on open re-creates what is needed). */
  clear(): void {
    this.queue = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private drain(): void {
    if (this.timer) return;
    while (this.queue.length > 0) {
      const now = Date.now();
      this.sentAt = this.sentAt.filter((t) => now - t < WINDOW_MS);
      if (this.sentAt.length >= this.maxPerSecond) {
        const wait = WINDOW_MS - (now - this.sentAt[0]);
        this.timer = setTimeout(() => {
          this.timer = null;
          this.drain();
        }, wait);
        this.timer.unref?.();
        return;
      }
      this.sentAt.push(now);
      this.send(this.queue.shift() as string);
    }
  }
}
