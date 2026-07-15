import { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { buildFromState } from '../utils/navigationFrom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Pencil,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Wifi,
} from 'lucide-react';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';
import StatusBadge from '../components/connectivity/StatusBadge';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function formatTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ConnectivityTargetDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canManageConnectivity, canAccessConnectivity, effectiveBranch } = useAuth();
  const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getTodayLocal);
  const [endDate, setEndDate] = useState(getTodayLocal);
  const [appliedRange, setAppliedRange] = useState({ start: getTodayLocal(), end: getTodayLocal() });

  const applyDateRange = () => setAppliedRange({ start: startDate, end: endDate });

  const { data, isLoading, error } = useQuery({
    queryKey: ['connectivity', 'target', id, effectiveBranch, appliedRange.start, appliedRange.end],
    queryFn: () =>
      connectivityApi.getTarget(id, {
        branch: effectiveBranch,
        checkLimit: 5000,
        startDate: appliedRange.start,
        endDate: appliedRange.end,
      }),
    enabled: !!canAccessConnectivity && !!id,
  });

  const { data: uptimeData } = useQuery({
    queryKey: ['connectivity', 'uptime', id, effectiveBranch, appliedRange.start, appliedRange.end],
    queryFn: () =>
      connectivityApi.getUptimeReport({
        branch: effectiveBranch,
        targetId: id,
        startDate: appliedRange.start,
        endDate: appliedRange.end,
      }),
    enabled: !!canAccessConnectivity && !!id,
  });

  const { data: outagesData } = useQuery({
    queryKey: ['connectivity', 'outages', id, effectiveBranch, appliedRange.start, appliedRange.end],
    queryFn: () =>
      connectivityApi.getOutages({
        branch: effectiveBranch,
        targetId: id,
        startDate: appliedRange.start,
        endDate: appliedRange.end,
        limit: 20,
      }),
    enabled: !!canAccessConnectivity && !!id,
  });

  const checkMutation = useMutation({
    mutationFn: () => connectivityApi.checkTarget(id, effectiveBranch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectivity', 'target', id] });
      queryClient.invalidateQueries({ queryKey: ['connectivity', 'uptime', id] });
      queryClient.invalidateQueries({ queryKey: ['connectivity', 'outages', id] });
      queryClient.invalidateQueries({ queryKey: ['connectivity', 'dashboard'] });
    },
  });

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
        <div className="h-12 bg-gray-200 animate-pulse rounded-lg w-48" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tile-card p-6 text-red-600">
        Failed to load target. {error?.response?.data?.error || error?.message}
      </div>
    );
  }

  const target = data?.target;
  if (!target) {
    return (
      <div className="tile-card p-6 text-gray-500">
        Target not found.
      </div>
    );
  }

  const uptimeResult = uptimeData?.results?.[0];
  const outages = outagesData?.outages ?? [];
  const checkResults = [...(target.checkResults || [])];

  const isSingleDay = appliedRange.start === appliedRange.end;
  const todayLocal = getTodayLocal();
  const isToday = appliedRange.end === todayLocal;

  const rawChartData = checkResults.map((c) => ({
    time: formatDateTime(c.checkedAt),
    fullTime: c.checkedAt,
    latency: c.latencyMs ?? 0,
    packetLoss: c.packetLossPercent ?? 0,
  }));

  const chartData = (() => {
    if (!isSingleDay || rawChartData.length === 0) return rawChartData;
    const startOfDay = new Date(appliedRange.start + 'T00:00:00');
    const endPoint = isToday ? new Date() : new Date(appliedRange.end + 'T23:59:59');
    const first = rawChartData[0];
    const last = rawChartData[rawChartData.length - 1];
    return [
      { time: formatDateTime(startOfDay), fullTime: startOfDay, latency: first?.latency ?? 0, packetLoss: first?.packetLoss ?? 0 },
      ...rawChartData,
      { time: formatDateTime(endPoint), fullTime: endPoint, latency: last?.latency ?? 0, packetLoss: last?.packetLoss ?? 0 },
    ];
  })();

  const uptimeChartData = (() => {
    if (isSingleDay && checkResults.length > 0) {
      let total = 0;
      let successful = 0;
      const points = [];
      const startOfDay = new Date(appliedRange.start + 'T00:00:00');
      const endPoint = isToday ? new Date() : new Date(appliedRange.end + 'T23:59:59');
      const firstCheckUptime = checkResults[0].status === 'up' || checkResults[0].status === 'partial' ? 100 : 0;
      for (const c of checkResults) {
        total++;
        if (c.status === 'up' || c.status === 'partial') successful++;
        const pct = total > 0 ? Math.round((successful / total) * 10000) / 100 : null;
        points.push({
          date: formatDateTime(c.checkedAt),
          dateStr: c.checkedAt,
          uptime: pct,
        });
      }
      const last = points[points.length - 1];
      return [
        { date: formatDateTime(startOfDay), dateStr: startOfDay, uptime: firstCheckUptime },
        ...points,
        { date: formatDateTime(endPoint), dateStr: endPoint, uptime: last?.uptime ?? (total > 0 ? Math.round((successful / total) * 10000) / 100 : null) },
      ];
    }
    const byDay = {};
    for (const c of checkResults) {
      const day = new Date(c.checkedAt).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, successful: 0 };
      byDay[day].total++;
      if (c.status === 'up' || c.status === 'partial') byDay[day].successful++;
    }
    const start = new Date(appliedRange.start);
    const end = new Date(appliedRange.end);
    const result = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayData = byDay[dateStr];
      result.push({
        date: d.toLocaleDateString([], { day: 'numeric', month: 'short' }),
        dateStr,
        uptime: dayData && dayData.total > 0
          ? Math.round((dayData.successful / dayData.total) * 10000) / 100
          : null,
      });
    }
    return result;
  })();

  const statusIconConfig = {
    up: { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    down: { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    partial: { Icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    dns_failure: { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  };
  const statusConfig = statusIconConfig[target.currentStatus] || {
    Icon: AlertTriangle,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  };
  const { Icon: StatusIcon } = statusConfig;

  const latencyValues = checkResults.filter((c) => c.latencyMs != null).map((c) => c.latencyMs);
  const avgLatency =
    latencyValues.length > 0
      ? latencyValues.reduce((s, v) => s + v, 0) / latencyValues.length
      : null;
  const avgPacketLoss =
    checkResults.length > 0
      ? checkResults.reduce((s, c) => s + (c.packetLossPercent ?? 0), 0) / checkResults.length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {target.customerName} — {target.siteName}
            </h1>
            <p className="text-sm text-gray-500 font-mono">{target.monitoringTarget}</p>
            {(target.contactPersonName || target.contactPersonPhone) && (
              <p className="text-sm text-gray-600 mt-1">
                Contact
                {target.contactPersonName ? `: ${target.contactPersonName}` : ''}
                {target.contactPersonName && target.contactPersonPhone ? ' · ' : target.contactPersonPhone ? ': ' : ''}
                {target.contactPersonPhone || ''}
              </p>
            )}
          </div>
        </div>
        {canManageConnectivity && (
          <Link
            to={`/connectivity/targets/${id}/edit`}
            state={buildFromState(location)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      <div className="tile-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div
              className={`p-6 rounded-2xl ${statusConfig.bg} ${statusConfig.color}`}
            >
              <StatusIcon className="h-20 w-20" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={target.currentStatus} />
              </div>
              <p className="text-sm text-gray-600">
                Latency: {target.currentLatencyMs != null ? `${Math.round(target.currentLatencyMs)} ms` : '-'}
              </p>
              <p className="text-sm text-gray-600">
                Packet loss: {target.currentPacketLossPercent != null ? `${target.currentPacketLossPercent}%` : '-'}
              </p>
              <p className="text-sm text-gray-500">Resolved IP: {target.resolvedIp || '-'}</p>
              <p className="text-sm text-gray-500">Last check: {formatDate(target.lastCheckAt)}</p>
            </div>
          </div>
          {canManageConnectivity && (
            <button
              onClick={() => checkMutation.mutate()}
              disabled={checkMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Activity className="h-5 w-5" />
              {checkMutation.isPending ? 'Pinging...' : 'Ping Now'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="tile-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {uptimeResult?.uptimePercent != null ? `${uptimeResult.uptimePercent}%` : '-'}
            </p>
            <p className="text-sm text-gray-500">Uptime</p>
          </div>
        </div>
        <div className="tile-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {avgLatency != null ? `${Math.round(avgLatency)} ms` : '-'}
            </p>
            <p className="text-sm text-gray-500">Avg Latency</p>
          </div>
        </div>
        <div className="tile-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {avgPacketLoss != null ? `${avgPacketLoss.toFixed(1)}%` : '-'}
            </p>
            <p className="text-sm text-gray-500">Avg Packet Loss</p>
          </div>
        </div>
        <div className="tile-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {target.consecutiveFailures ?? 0}
            </p>
            <p className="text-sm text-gray-500">Consecutive Failures</p>
          </div>
        </div>
      </div>

      <div className="tile-card p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Uptime Report</h2>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(trimLeading(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(trimLeading(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={applyDateRange}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Apply
          </button>
        </div>
        <p className="text-lg">
          Uptime: <strong>{uptimeResult?.uptimePercent != null ? `${uptimeResult.uptimePercent}%` : '-'}</strong>
          {uptimeResult && ` (${uptimeResult.successfulChecks} / ${uptimeResult.totalChecks} checks)`}
        </p>
      </div>

      {uptimeChartData.length > 0 && (
        <div className="tile-card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Uptime Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uptimeChartData}>
                <defs>
                  <linearGradient id="uptimeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [v != null ? `${v}%` : '-', 'Uptime']} />
                <Area type="monotone" dataKey="uptime" stroke="#22c55e" strokeWidth={2} fill="url(#uptimeFill)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <div className="tile-card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Latency Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}ms`} />
                  <Tooltip formatter={(v) => [`${v} ms`, 'Latency']} />
                  <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="tile-card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Packet Loss Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Packet Loss']} />
                  <Line type="monotone" dataKey="packetLoss" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="tile-card overflow-hidden">
        <h2 className="px-4 py-3 bg-gray-50 font-semibold text-gray-900">Recent Outages</h2>
        {outages.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No outages recorded.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Started</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ended</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {outages.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 text-sm">{formatDate(o.startedAt)}</td>
                  <td className="px-4 py-2 text-sm">{o.endedAt ? formatDate(o.endedAt) : 'Ongoing'}</td>
                  <td className="px-4 py-2 text-sm">
                    {o.durationSeconds != null
                      ? o.durationSeconds >= 60
                        ? `${Math.floor(o.durationSeconds / 60)}m ${o.durationSeconds % 60}s`
                        : `${o.durationSeconds}s`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
