import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function AdminProtectedRoute() {
  const { isAuthenticated, loadUser, logout, user } = useAuth();
  const [loading, setLoading] = useState(isAuthenticated && !user);

  useEffect(() => {
    if (!isAuthenticated || user) {
      setLoading(false);
      return;
    }

    async function loadCurrentUser() {
      try {
        await loadUser();
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loading) return <LoadingState label="Checking admin access..." />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
