import { useEffect, useState } from 'react';

const FLASH_MS = 600;
const FLASH_CLASS = { up: 'bg-up/20', down: 'bg-down/20' } as const;

/**
 * Last-price cell that briefly flashes green (up) or red (down) when the price changes (ARCHITECTURE §11.3
 * "Motion": 20 % opacity, 600 ms fade, no animation with prefers-reduced-motion). `data-flash` is the test hook.
 */
export function PriceCell({ testId, price, text }: { testId: string; price: number; text: string }) {
  const [prev, setPrev] = useState(price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  if (price !== prev) {
    setPrev(price);
    setFlash(price > prev ? 'up' : 'down');
  }
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash, price]);

  return (
    <span
      data-testid={testId}
      data-flash={flash ?? undefined}
      className={`rounded-input text-right transition-colors duration-600 motion-reduce:transition-none ${flash ? FLASH_CLASS[flash] : ''}`}
    >
      {text}
    </span>
  );
}
