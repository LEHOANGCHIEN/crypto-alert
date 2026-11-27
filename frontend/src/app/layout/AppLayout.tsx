import { Outlet, useMatch } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '../../shared/ui/toast';
import { PreferencesSync } from '../PreferencesSync';
import { RealtimeConnection } from '../RealtimeConnection';
import { ConnBanner } from './ConnBanner';
import { PulseBar } from './PulseBar';
import { StatusBar } from './StatusBar';
import { LastSymbolTracker } from './LastSymbolTracker';
import { WatchlistLoginPrompt, WatchlistSession } from '../../features/watchlist';
import { AlertSession } from '../../features/alerts';
import { NotificationsSession } from '../../features/notifications';

export function AppLayout() {
  // The dashboard uses the full area; other pages are padded and scrollable.
  const isDashboard = useMatch('/trade/:symbol') !== null;
  // Auth pages are two full-bleed columns (AC-UI-10): no padding, the page fills the area.
  const isLogin = useMatch('/login') !== null;
  const isRegister = useMatch('/register') !== null;
  const isAuth = isLogin || isRegister;
  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <Header />
      <ConnBanner />
      {isDashboard && <PulseBar />}
      <main className={`min-h-0 flex-1 ${isDashboard ? 'overflow-hidden' : isAuth ? 'flex flex-col overflow-auto' : 'overflow-auto p-4'}`}>
        <Outlet />
      </main>
      <StatusBar />
      <Footer />
      <Toaster />
      <LastSymbolTracker />
      <PreferencesSync />
      <RealtimeConnection />
      <WatchlistSession />
      <AlertSession />
      <NotificationsSession />
      <WatchlistLoginPrompt />
    </div>
  );
}
