import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shouldPromptForBranch } from '../utils/branchSelection';

const ProtectedRoute = ({ children, adminOnly = false, requireModule = null }) => {
  const { user, loading, isElevated, canSwitchBranches, selectedBranch, hasModule } = useAuth();
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

  if (adminOnly && !isElevated) {
    return <Navigate to="/" replace />;
  }

  if (requireModule && !hasModule(requireModule)) {
    return <Navigate to="/" replace />;
  }

  if (
    canSwitchBranches &&
    shouldPromptForBranch(user) &&
    selectedBranch == null &&
    location.pathname !== '/branch-select'
  ) {
    return <Navigate to="/branch-select" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
