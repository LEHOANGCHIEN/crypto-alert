import { Outlet, useMatch } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '../../shared/ui/toast';
import { PreferencesSync } from '../PreferencesSync';
import { RealtimeConnection } from '../RealtimeConnection';
import { ConnBanner } from './ConnBanner';
import { WatchlistLoginPrompt, WatchlistSession } from '../../features/watchlist';
import { AlertSession } from '../../features/alerts';
import { NotificationsSession } from '../../features/notifications';

export function AppLayout() {
  // The dashboard uses the full area; other pages are padded and scrollable.
  const isDashboard = useMatch('/trade/:symbol') !== null;
  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <Header />
      <ConnBanner />
      <main className={`min-h-0 flex-1 ${isDashboard ? 'overflow-hidden' : 'overflow-auto p-4'}`}>
        <Outlet />
      </main>
      <Footer />
      <Toaster />
      <PreferencesSync />
      <RealtimeConnection />
      <WatchlistSession />
      <AlertSession />
      <NotificationsSession />
      <WatchlistLoginPrompt />
    </div>
  );
}
