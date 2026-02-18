import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHost } from "../contexts/HostContext";
import type { ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: hostLoading, error } = useHost();

  if (authLoading || (user && hostLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <p className="mt-2 text-xs text-gray-500">
            You have been signed out. Please contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
