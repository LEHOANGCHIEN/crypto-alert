import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { request } from '../../shared/api/http';
import type { Alert, AlertCondition } from '../../shared/api/types';
import { useAuth } from '../../shared/auth/auth.store';
import { errorText } from '../../shared/i18n/errorText';
import { toast } from '../../shared/ui/toast';

const KEY = ['alerts'] as const;

/** All of the user's alerts (newest first); the panel splits them by status. */
export const useAlerts = () => {
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({ queryKey: KEY, queryFn: () => request<Alert[]>('GET', '/alerts'), enabled: authed });
};

export type NewAlert = { symbol: string; condition: AlertCondition; targetPrice: number };

/** Errors are shown by the form (inline), not as toasts. */
export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAlert) => request<Alert>('POST', '/alerts', input),
    onSuccess: (alert) => {
      qc.setQueryData<Alert[]>(KEY, (old = []) => [alert, ...old.filter((a) => a.id !== alert.id)]);
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => request<{ id: number }>('DELETE', `/alerts/${id}`),
    onSuccess: (_res, id) => qc.setQueryData<Alert[]>(KEY, (old = []) => old.filter((a) => a.id !== id)),
    onError: (err) => toast.error(errorText(t, err)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
