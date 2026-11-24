import { useEffect } from 'react';
import { useAuth } from '../shared/auth/auth.store';
import { startSocket } from '../shared/socket/socket';

/** Opens the socket once the session state is known, so the first handshake already carries the token. */
export function RealtimeConnection() {
  const status = useAuth((s) => s.status);
  useEffect(() => {
    if (status !== 'loading') startSocket();
  }, [status]);
  return null;
}
