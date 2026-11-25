import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../../shared/auth/auth.store';

/** Drops cached alerts whenever the signed-in user changes, so one user never sees another's alerts. */
export function AlertSession() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id ?? null);
  useEffect(() => {
    qc.removeQueries({ queryKey: ['alerts'] });
  }, [userId, qc]);
  return null;
}
