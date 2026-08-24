import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d11] text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;
