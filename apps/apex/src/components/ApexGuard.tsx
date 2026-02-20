import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { ReactNode } from "react";

export function ApexGuard({ children }: { children: ReactNode }) {
  const { user, loading, isApex } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !isApex) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
