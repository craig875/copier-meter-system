import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { branchLabel } from '../utils/branchSelection';

const branchStyle = {
  JHB: { color: 'bg-blue-50', iconColor: 'text-blue-800' },
  CT: { color: 'bg-purple-50', iconColor: 'text-purple-800' },
};

const BranchSelect = () => {
  const { user, allowedBranches, canSwitchBranches, switchBranch } = useAuth();
  const [selecting, setSelecting] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const resolveTarget = () => {
    const stored = sessionStorage.getItem('branchSelectReturn');
    if (stored?.startsWith('/') && !stored.startsWith('//')) {
      sessionStorage.removeItem('branchSelectReturn');
      return stored;
    }
    const from = location.state?.from;
    if (from?.pathname) {
      return `${from.pathname}${from.search || ''}${from.hash || ''}`;
    }
    return '/';
  };

  const handleSelect = async (branch) => {
    setSelecting(branch);
    try {
      await switchBranch(branch);
      navigate(resolveTarget(), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not switch branch');
    } finally {
      setSelecting(null);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canSwitchBranches) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgb(226 232 240), rgb(241 245 249), rgb(228 231 235))',
      }}
    >
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Choose a branch</h1>
          <p className="text-gray-500 mt-2">
            Hi {user.name || 'there'} — select a branch to continue.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allowedBranches.map((branch) => {
            const style = branchStyle[branch] ?? branchStyle.JHB;
            return (
              <button
                key={branch}
                type="button"
                disabled={selecting != null}
                onClick={() => handleSelect(branch)}
                className="tile-card p-8 text-left group w-full hover:ring-2 hover:ring-red-500/30 transition-shadow disabled:opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-xl ${style.color} group-hover:scale-105 transition-transform`}>
                    <Building2 className={`h-10 w-10 ${style.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{branchLabel(branch)}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selecting === branch ? 'Switching…' : branch}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BranchSelect;
