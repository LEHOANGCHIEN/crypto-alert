import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccountPage } from '../features/account/AccountPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { GuestOnly, RequireAuth } from '../features/auth/RequireAuth';
import { PlaceholderPage } from './pages/PlaceholderPage';

/** `/trade/btcusdt` → `/trade/BTCUSDT` (SPEC §4) */
function TradeRoute() {
  const { symbol = '' } = useParams();
  if (symbol !== symbol.toUpperCase()) return <Navigate to={`/trade/${symbol.toUpperCase()}${location.search}`} replace />;
  return <PlaceholderPage page="trade" />;
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/trade/BTCUSDT" replace /> },
      { path: '/trade/:symbol', element: <TradeRoute /> },
      { element: <GuestOnly />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }] },
      { element: <RequireAuth />, children: [{ path: '/account', element: <AccountPage /> }] },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
