import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ConnectivityTimeWindows() {
  const { canManageConnectivity, effectiveBranch } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['connectivity', 'time-windows', effectiveBranch],
    queryFn: () => connectivityApi.getTimeWindows(effectiveBranch),
    enabled: !!canManageConnectivity,
  });

  if (!canManageConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        Admin access required to manage alert time windows.
      </div>
    );
  }

  const timeWindows = data?.timeWindows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Alert Time Windows</h1>
        <Link to="/connectivity" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      <p className="text-gray-600 text-sm">
        Alerts are only sent within configured time windows. Outside these hours, outages are logged but no email is sent.
      </p>

      <div className="tile-card overflow-hidden">
        {isLoading ? (
          <div className="h-32 bg-gray-200 animate-pulse" />
        ) : timeWindows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No time windows configured. Default: alerts sent 24/7. Add a window to restrict alert hours.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enabled</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeWindows.map((tw) => (
                <tr key={tw.id}>
                  <td className="px-4 py-3 text-sm">{tw.targetId ? (tw.target?.customerName || tw.targetId) : 'Global'}</td>
                  <td className="px-4 py-3 text-sm">{tw.startTime} – {tw.endTime}</td>
                  <td className="px-4 py-3 text-sm">
                    {(tw.daysOfWeek || []).map((d) => DAYS[d - 1] || d).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{tw.enabled ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
