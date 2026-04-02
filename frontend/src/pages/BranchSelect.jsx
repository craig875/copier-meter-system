import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { shouldPromptForBranch } from '../utils/branchSelection';

const sites = [
  {
    branch: 'JHB',
    title: 'Johannesburg',
    subtitle: 'JHB',
    color: 'bg-blue-50',
    iconColor: 'text-blue-800',
  },
  {
    branch: 'CT',
    title: 'Cape Town',
    subtitle: 'CT',
    color: 'bg-purple-50',
    iconColor: 'text-purple-800',
  },
];

const BranchSelect = () => {
  const { updateSelectedBranch, user, canSwitchBranches } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!canSwitchBranches || !shouldPromptForBranch(user)) {
      navigate('/', { replace: true });
    }
  }, [canSwitchBranches, navigate, user]);

  const resolveTarget = () => {
    try {
      const stored = sessionStorage.getItem('branchSelectReturn');
      if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
        sessionStorage.removeItem('branchSelectReturn');
        return stored;
      }
    } catch {
      // ignore
    }
    const from = location.state?.from;
    if (from && typeof from.pathname === 'string') {
      return `${from.pathname}${from.search || ''}${from.hash || ''}`;
    }
    return '/';
  };

  const handleClick = (branch) => {
    updateSelectedBranch(branch);
    navigate(resolveTarget(), { replace: true });
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Choose a site</h1>
          <p className="text-gray-500 mt-2">
            Hi {user?.name || 'there'} — select Johannesburg or Cape Town to continue.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sites.map((site) => (
            <button
              key={site.branch}
              type="button"
              onClick={() => handleClick(site.branch)}
              className="tile-card p-8 text-left group w-full hover:ring-2 hover:ring-red-500/30 transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-4 rounded-xl ${site.color} group-hover:scale-105 transition-transform`}
                >
                  <Building2 className={`h-10 w-10 ${site.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{site.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{site.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchSelect;
