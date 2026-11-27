import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

const read = (): boolean => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : true);

/** True from 1024 px up (the `lg` breakpoint); below that the mobile layout is used. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}
