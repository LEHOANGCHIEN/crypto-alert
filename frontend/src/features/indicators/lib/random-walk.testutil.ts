/** Deterministic close prices for tests (mulberry32 PRNG random walk). */
export function randomWalk(length: number, seed = 42, start = 30_000): number[] {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  let p = start;
  for (let i = 0; i < length; i++) {
    p = Math.max(1, p * (1 + (rnd() - 0.5) * 0.02));
    out.push(Math.round(p * 100) / 100);
  }
  return out;
}
