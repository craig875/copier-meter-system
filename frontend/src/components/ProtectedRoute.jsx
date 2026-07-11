import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, strictAdminOnly = false, requireModule = null }) => {
  const { user, loading, isElevated, isAdmin, hasModule } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // strictAdminOnly = role === 'admin' only (excludes manager)
  // adminOnly = elevated (admin OR manager) — historical naming in this app
  if (strictAdminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isElevated) {
    return <Navigate to="/" replace />;
  }

  if (requireModule && !hasModule(requireModule)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
