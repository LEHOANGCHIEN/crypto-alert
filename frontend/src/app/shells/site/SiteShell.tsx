import { Outlet, useMatch } from 'react-router-dom';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { ConnBanner } from '../common/ConnBanner';
import { useConnection } from '../../../shared/socket/connection.store';
import { SearchDialog } from '../../../shared/search/SearchDialog';

/** Site shell: header + page + full footer. Used by every page except `/chart/*`. */
export function SiteShell() {
  // Auth pages are two full-bleed columns (AC-UI-10): no padding, the page fills the area; the footer stays below.
  const isLogin = useMatch('/login') !== null;
  const isRegister = useMatch('/register') !== null;
  const isAuth = isLogin || isRegister;
  // Test hook: the realtime socket to our backend is connected (site pages have no status bar).
  const connected = useConnection((s) => s.connected);
  return (
    <div data-testid="site-shell" data-connected={String(connected)} className="flex h-full flex-col overflow-auto bg-bg text-text">
      <SiteHeader />
      <ConnBanner />
      <main className={`flex flex-1 flex-col ${isAuth ? '' : 'p-4'}`}>
        <Outlet />
      </main>
      <SiteFooter flush={isAuth} />
      <SearchDialog />
    </div>
  );
}
