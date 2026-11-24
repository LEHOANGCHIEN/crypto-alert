import { SendQueue } from './send-queue';

describe('SendQueue', () => {
  beforeEach(() => jest.useFakeTimers({ now: 1_000_000 }));
  afterEach(() => jest.useRealTimers());

  it('sends at most 4 messages per second, in order', () => {
    const sent: { m: string; at: number }[] = [];
    const q = new SendQueue((m) => sent.push({ m, at: Date.now() }));
    for (let i = 0; i < 10; i++) q.push(`m${i}`);
    expect(sent.map((s) => s.m)).toEqual(['m0', 'm1', 'm2', 'm3']);
    jest.advanceTimersByTime(999);
    expect(sent).toHaveLength(4);
    jest.advanceTimersByTime(1);
    expect(sent).toHaveLength(8);
    jest.advanceTimersByTime(1000);
    expect(sent.map((s) => s.m)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9']);
    // Any 1-second window holds at most 4 sends.
    for (const s of sent) expect(sent.filter((o) => o.at >= s.at && o.at < s.at + 1000).length).toBeLessThanOrEqual(4);
  });

  it('clear() drops pending messages', () => {
    const sent: string[] = [];
    const q = new SendQueue((m) => sent.push(m));
    for (let i = 0; i < 6; i++) q.push(`m${i}`);
    expect(q.pending).toBe(2);
    q.clear();
    jest.advanceTimersByTime(5000);
    expect(sent).toHaveLength(4);
  });
});
