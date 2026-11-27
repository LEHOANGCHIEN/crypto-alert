import { useCallback, useEffect, useRef, useState } from 'react';

/** Tracks the height of an element (ResizeObserver); returns a ref callback and the current height in px. */
export function useElementHeight<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [height, setHeight] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    setHeight(el.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    observer.current = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, height];
}
