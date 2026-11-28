import { Outlet } from 'react-router-dom';
import { Toaster } from '../shared/ui/toast';
import { PreferencesSync } from './PreferencesSync';
import { RealtimeConnection } from './RealtimeConnection';
import { LastSymbolTracker } from './LastSymbolTracker';
import { WatchlistLoginPrompt, WatchlistSession } from '../features/watchlist';
import { AlertSession } from '../features/alerts';
import { NotificationsSession } from '../features/notifications';

/** Root of every route: global sessions and the toaster around the active shell (site or chart). */
export function RootLayout() {
  return (
    <>
      <div className="h-full">
        <Outlet />
      </div>
      <Toaster />
      <LastSymbolTracker />
      <PreferencesSync />
      <RealtimeConnection />
      <WatchlistSession />
      <AlertSession />
      <NotificationsSession />
      <WatchlistLoginPrompt />
    </>
  );
}
