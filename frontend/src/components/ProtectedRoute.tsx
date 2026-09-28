import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useNexusStore } from '../store/useNexusStore';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useNexusStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Redirect unauthenticated user to landing page
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
