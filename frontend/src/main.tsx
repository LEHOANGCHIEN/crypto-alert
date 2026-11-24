import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './shared/i18n';
import './index.css';
import { ThemeProvider } from './shared/theme/ThemeProvider';
import { router } from './app/router';
import { useAuth } from './shared/auth/auth.store';
import { queryClient } from './shared/api/queryClient';

void useAuth.getState().restore(); // session restore before/while the first render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
