import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for the backend to verify any saved token.
  if (loading) {
    return <p className="page-message">Checking your session...</p>;
  }

  // Redirect visitors who have not logged in.
  // Remember the requested page so we can return to it later.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Render the matched child route.
  return <Outlet />;
}
