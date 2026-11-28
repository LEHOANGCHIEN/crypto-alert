import { useLocation } from 'react-router-dom';
import { useLastSymbol } from '../../../shared/nav/lastSymbol';

export type MenuItemId = 'chart' | 'overview' | 'alerts' | 'notifications';
export type MenuItem = { id: MenuItemId; to: string; active: boolean; icon: string };

/**
 * Items of the "Products" menu. Only pages that exist in the current phase are listed
 * (Markets / Community / News menus appear when their first page exists, SPEC AC-UI-09).
 */
export function useProductItems(): MenuItem[] {
  const symbol = useLastSymbol((s) => s.symbol);
  const { pathname } = useLocation();
  const is = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return [
    { id: 'chart', to: `/chart/${symbol}`, active: is('/chart'), icon: 'M3 17l5-6 4 3 5-8 4 5' },
    { id: 'overview', to: `/coin/${symbol}`, active: is('/coin'), icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
    { id: 'alerts', to: '/alerts', active: is('/alerts'), icon: 'M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0' },
    { id: 'notifications', to: '/notifications', active: is('/notifications'), icon: 'M4 5h16v11H8l-4 4V5z' },
  ];
}
