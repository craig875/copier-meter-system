import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';

function formatDuration(sec) {
  if (sec == null) return '-';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

export default function ConnectivityOutages() {
  const { canAccessConnectivity, effectiveBranch } = useAuth();
  const [targetId, setTargetId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = { limit: 100, branch: effectiveBranch };
  if (targetId) params.targetId = targetId;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data, isLoading } = useQuery({
    queryKey: ['connectivity', 'outages', effectiveBranch, params],
    queryFn: () => connectivityApi.getOutages(params),
    enabled: !!canAccessConnectivity,
  });

  if (!canAccessConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to outage logs.
      </div>
    );
  }

  const outages = data?.outages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Outage Log</h1>
      </div>

      <div className="tile-card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(trimLeading(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(trimLeading(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="tile-card overflow-hidden">
        {isLoading ? (
          <div className="h-32 bg-gray-200 animate-pulse" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ended</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {outages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No outages recorded</td>
                </tr>
              ) : (
                outages.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-sm">{o.target?.customerName || '-'}</td>
                    <td className="px-4 py-3 text-sm">{o.target?.siteName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(o.startedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(o.endedAt)}</td>
                    <td className="px-4 py-3 text-sm">{formatDuration(o.durationSeconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
