import { QueryClient } from '@tanstack/react-query';

/** The app's single TanStack Query client (also used by the socket client to refresh data after a reconnect). */
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
