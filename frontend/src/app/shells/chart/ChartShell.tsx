import { Outlet } from 'react-router-dom';
import { ChartHeader } from './ChartHeader';
import { PulseBar } from './PulseBar';
import { StatusBar } from './StatusBar';
import { ConnBanner } from '../common/ConnBanner';
import { SearchDialog } from '../../../shared/search/SearchDialog';

/** Chart shell (`/chart/:symbol`): compact header, market pulse bar, dashboard, status bar. Never a site header/footer. */
export function ChartShell() {
  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <ChartHeader />
      <ConnBanner />
      <PulseBar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <StatusBar />
      <SearchDialog />
    </div>
  );
}
