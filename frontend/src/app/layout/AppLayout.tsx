import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '../../shared/ui/toast';
import { PreferencesSync } from '../PreferencesSync';

export function AppLayout() {
  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <Header />
      <main className="min-h-0 flex-1 overflow-auto p-4">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
      <PreferencesSync />
    </div>
  );
}
