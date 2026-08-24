import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  console.log("[ProtectedRoute]", {
    user,
    isAuthenticated,
    loading,
    pathname: location.pathname,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d11] text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
