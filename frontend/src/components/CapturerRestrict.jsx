import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Restricts access for capturer role - redirects to home.
 * Capturers can only access Capture and History.
 */
const CapturerRestrict = ({ children }) => {
  const { isCapturer } = useAuth();
  if (isCapturer) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default CapturerRestrict;
