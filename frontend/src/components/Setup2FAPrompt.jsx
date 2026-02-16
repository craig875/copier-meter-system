import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export default function Setup2FAPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Show prompt when user has 2FA disabled (data from login/getMe - no extra API call)
  const show = !!user && !user.twoFactorEnabled && location.pathname !== '/security';

  const handleSetup = () => {
    navigate('/security');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-amber-100">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Set up 2FA to continue
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Two-factor authentication is required. Please set it up now to access your account.
            </p>
            <button
              onClick={handleSetup}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Set up 2FA now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
