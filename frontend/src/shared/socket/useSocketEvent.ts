import { useEffect, useRef } from 'react';
import { getSocket } from './socket';
import type { ServerEvents } from './events';

/** Listens to a server event while the component is mounted. */
export function useSocketEvent<E extends keyof ServerEvents>(event: E, handler: (payload: ServerEvents[E]) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    const s = getSocket();
    const listener = (p: ServerEvents[E]) => ref.current(p);
    s.on(event as string, listener);
    return () => {
      s.off(event as string, listener);
    };
  }, [event]);
}
