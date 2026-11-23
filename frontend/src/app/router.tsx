import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';
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
      { path: '/login', element: <PlaceholderPage page="login" /> },
      { path: '/register', element: <PlaceholderPage page="register" /> },
      { path: '/account', element: <PlaceholderPage page="account" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
