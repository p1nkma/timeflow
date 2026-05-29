import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { hasToken } from './token';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  if (!hasToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
