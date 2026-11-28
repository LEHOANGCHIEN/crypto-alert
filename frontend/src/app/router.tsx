import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { SiteShell } from './shells/site/SiteShell';
import { ChartShell } from './shells/chart/ChartShell';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccountPage } from '../features/account/AccountPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { GuestOnly, RequireAuth } from '../features/auth/RequireAuth';
import { ChartPage } from './pages/ChartPage';
import { HomePage } from './pages/HomePage';
import { AlertsPage } from './pages/AlertsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CoinPage } from '../features/coin';

/** `/chart/btcusdt` → `/chart/BTCUSDT` (SPEC §4) */
function ChartRoute() {
  const { symbol = '' } = useParams();
  if (symbol !== symbol.toUpperCase()) return <Navigate to={`/chart/${symbol.toUpperCase()}${location.search}`} replace />;
  return <ChartPage />;
}

/** `/trade/:symbol?tf=4h` → `/chart/:symbol?tf=4h` (SPEC §3, kept for old links) */
function TradeRedirect() {
  const { symbol = '' } = useParams();
  return <Navigate to={`/chart/${symbol.toUpperCase()}${location.search}`} replace />;
}

/** `/coin/btcusdt` → `/coin/BTCUSDT` */
function CoinRoute() {
  const { symbol = '' } = useParams();
  if (symbol !== symbol.toUpperCase()) return <Navigate to={`/coin/${symbol.toUpperCase()}`} replace />;
  return <CoinPage />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <ChartShell />,
        children: [{ path: '/chart/:symbol', element: <ChartRoute /> }],
      },
      {
        element: <SiteShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/trade/:symbol', element: <TradeRedirect /> },
          { path: '/coin/:symbol', element: <CoinRoute /> },
          { element: <GuestOnly />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }] },
          {
            element: <RequireAuth />,
            children: [
              { path: '/account', element: <AccountPage /> },
              { path: '/alerts', element: <AlertsPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
