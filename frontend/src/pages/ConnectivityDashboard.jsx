import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Settings, BarChart2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';
import ConnectivitySummaryCards from '../components/connectivity/ConnectivitySummaryCards';
import StatusBadge from '../components/connectivity/StatusBadge';

const rowStyleByStatus = {
  up: { border: 'border-l-4 border-l-green-500', bg: 'bg-green-50/40' },
  down: { border: 'border-l-4 border-l-red-500', bg: 'bg-red-50/40' },
  partial: { border: 'border-l-4 border-l-amber-500', bg: 'bg-amber-50/40' },
  dns_failure: { border: 'border-l-4 border-l-red-500', bg: 'bg-red-50/40' },
  unknown: { border: 'border-l-4 border-l-gray-300', bg: 'bg-gray-50/40' },
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

export default function ConnectivityDashboard() {
  const { canAccessConnectivity, canManageConnectivity } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || '';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusFromUrl);

  useEffect(() => {
    if (statusFromUrl) setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);
  const [sortBy, setSortBy] = useState('customerName');
  const [sortDir, setSortDir] = useState('asc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['connectivity', 'dashboard'],
    queryFn: () => connectivityApi.getDashboard(),
    refetchInterval: 30000,
    enabled: !!canAccessConnectivity,
  });

  const filtered = useMemo(() => {
    if (!data?.targets) return [];
    let list = [...data.targets];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) =>
        t.customerName?.toLowerCase().includes(s) ||
        t.siteName?.toLowerCase().includes(s) ||
        t.monitoringTarget?.toLowerCase().includes(s) ||
        t.supplier?.toLowerCase().includes(s) ||
        t.circuitNumber?.toLowerCase().includes(s) ||
        t.fno?.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      list = list.filter((t) => t.currentStatus === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data?.targets, search, statusFilter, sortBy, sortDir]);

  if (!canAccessConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to connectivity monitoring.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tile-card p-6 text-red-600">
        Failed to load dashboard. The connectivity module may be disabled.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Connectivity Monitoring</h1>
        <div className="flex gap-2">
          <Link
            to="/connectivity/reports"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <BarChart2 className="h-4 w-4" />
            Reports
          </Link>
          <Link
            to="/connectivity/outages"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <AlertTriangle className="h-4 w-4" />
            Outages
          </Link>
          {canManageConnectivity && (
            <>
              <Link
                to="/connectivity/targets"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Manage Targets
              </Link>
              <Link
                to="/connectivity/targets/new"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Target
              </Link>
            </>
          )}
        </div>
      </div>

      <ConnectivitySummaryCards summary={data?.summary} />

      <div className="tile-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, site, target..."
              value={search}
              onChange={(e) => setSearch(trimLeading(e.target.value))}
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="partial">Partial</option>
            <option value="dns_failure">DNS Failure</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Customer', 'Site', 'Supplier', 'Circuit No', 'FNO', 'Target', 'Resolved IP', 'Status', 'Latency', 'Last Check'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      const key = h === 'Customer' ? 'customerName' : h === 'Site' ? 'siteName' : h === 'Supplier' ? 'supplier' : h === 'Circuit No' ? 'circuitNumber' : h === 'FNO' ? 'fno' : h === 'Target' ? 'monitoringTarget' : h === 'Resolved IP' ? 'resolvedIp' : h === 'Status' ? 'currentStatus' : h === 'Latency' ? 'currentLatencyMs' : 'lastCheckAt';
                      setSortBy(key);
                      setSortDir(sortBy === key && sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No monitoring targets. {canManageConnectivity && 'Add a target to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const status = t.currentStatus ?? 'unknown';
                  const style = rowStyleByStatus[status] ?? rowStyleByStatus.unknown;
                  return (
                  <tr
                    key={t.id}
                    className={clsx('cursor-pointer hover:opacity-90', style.bg)}
                    onClick={() => navigate(`/connectivity/targets/${t.id}`)}
                  >
                    <td className={clsx('px-4 py-3 text-sm text-gray-900', style.border)}>
                      {t.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{t.siteName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.supplier || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{t.circuitNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.fno || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{t.monitoringTarget}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{t.resolvedIp || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.currentStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm">{t.currentLatencyMs != null ? `${Math.round(t.currentLatencyMs)} ms` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(t.lastCheckAt)}</td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
