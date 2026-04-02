import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Download, BarChart2 } from 'lucide-react';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toISOString().slice(0, 10);
}

export default function ConnectivityReports() {
  const { canAccessConnectivity, effectiveBranch } = useAuth();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const { data: uptimeData, isLoading: uptimeLoading } = useQuery({
    queryKey: ['connectivity', 'uptime', effectiveBranch, startDate, endDate],
    queryFn: () => connectivityApi.getUptimeReport({ branch: effectiveBranch, startDate, endDate }),
    enabled: !!canAccessConnectivity,
  });

  const { data: slaData, isLoading: slaLoading } = useQuery({
    queryKey: ['connectivity', 'sla', effectiveBranch, startDate, endDate],
    queryFn: () => connectivityApi.getSlaReport({ branch: effectiveBranch, startDate, endDate }),
    enabled: !!canAccessConnectivity,
  });

  const handleExport = async () => {
    try {
      const res = await connectivityApi.exportReport({ branch: effectiveBranch, startDate, endDate, format: 'csv' });
      const blob = res?.data ?? res;
      if (!blob) throw new Error('No data');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uptime-report-${startDate || 'start'}-${endDate || 'end'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (!canAccessConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to reports.
      </div>
    );
  }

  const results = uptimeData?.results ?? [];
  const slaResults = slaData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Connectivity Reports</h1>
        <Link to="/connectivity" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Back to Dashboard
        </Link>
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
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="tile-card overflow-hidden">
        <h2 className="px-4 py-3 bg-gray-50 font-medium">Uptime Report</h2>
        {uptimeLoading ? (
          <div className="h-32 bg-gray-200 animate-pulse" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Circuit No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FNO</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Checks</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Uptime %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No data for this period</td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.targetId} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/connectivity/targets/${r.targetId}`)}>
                    <td className="px-4 py-2 text-sm"><Link to={`/connectivity/targets/${r.targetId}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r.customerName}</Link></td>
                    <td className="px-4 py-2 text-sm">{r.siteName}</td>
                    <td className="px-4 py-2 text-sm">{r.supplier || '-'}</td>
                    <td className="px-4 py-2 text-sm font-mono">{r.circuitNumber || '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.fno || '-'}</td>
                    <td className="px-4 py-2 text-sm font-mono">{r.monitoringTarget}</td>
                    <td className="px-4 py-2 text-sm">{r.totalChecks}</td>
                    <td className="px-4 py-2 text-sm">{r.uptimePercent != null ? `${r.uptimePercent}%` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="tile-card overflow-hidden">
        <h2 className="px-4 py-3 bg-gray-50 font-medium">SLA Report</h2>
        {slaLoading ? (
          <div className="h-32 bg-gray-200 animate-pulse" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Circuit No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FNO</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SLA Target</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Uptime %</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meets SLA</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slaResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No data for this period</td>
                </tr>
              ) : (
                slaResults.map((r) => (
                  <tr key={r.targetId} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/connectivity/targets/${r.targetId}`)}>
                    <td className="px-4 py-2 text-sm"><Link to={`/connectivity/targets/${r.targetId}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r.customerName}</Link></td>
                    <td className="px-4 py-2 text-sm">{r.siteName}</td>
                    <td className="px-4 py-2 text-sm">{r.supplier || '-'}</td>
                    <td className="px-4 py-2 text-sm font-mono">{r.circuitNumber || '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.fno || '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.slaTarget}%</td>
                    <td className="px-4 py-2 text-sm">{r.uptimePercent != null ? `${r.uptimePercent}%` : '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      {r.meetsSla ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </td>
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
