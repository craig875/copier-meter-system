import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { readingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Printer, 
  FileSpreadsheet,
  History,
  Upload
} from 'lucide-react';

const Dashboard = () => {
  const { effectiveBranch, isAdmin, isMeterUser, user } = useAuth();
  const canSwitchBranches = isAdmin || (isMeterUser && !user?.branch);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: readingsData, isLoading } = useQuery({
    queryKey: ['readings', currentYear, currentMonth, effectiveBranch],
    queryFn: () => readingsApi.get(currentYear, currentMonth, false, effectiveBranch),
  });

  const { data: jhbData } = useQuery({
    queryKey: ['readings', currentYear, currentMonth, 'JHB'],
    queryFn: () => readingsApi.get(currentYear, currentMonth, false, 'JHB'),
    enabled: canSwitchBranches,
  });
  const { data: ctData } = useQuery({
    queryKey: ['readings', currentYear, currentMonth, 'CT'],
    queryFn: () => readingsApi.get(currentYear, currentMonth, false, 'CT'),
    enabled: canSwitchBranches,
  });

  const summary = readingsData?.data?.summary || {
    totalMachines: 0,
    capturedCount: 0,
    pendingCount: 0,
  };
  const jhbSummary = jhbData?.data?.summary || { totalMachines: 0, capturedCount: 0 };
  const ctSummary = ctData?.data?.summary || { totalMachines: 0, capturedCount: 0 };

  const progressPercent = summary.totalMachines > 0 
    ? Math.round((summary.capturedCount / summary.totalMachines) * 100)
    : 0;
  const jhbPercent = jhbSummary.totalMachines > 0 ? Math.round((jhbSummary.capturedCount / jhbSummary.totalMachines) * 100) : 0;
  const ctPercent = ctSummary.totalMachines > 0 ? Math.round((ctSummary.capturedCount / ctSummary.totalMachines) * 100) : 0;

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  const getProgressColor = (pct) => {
    if (pct < 34) return 'rgb(220, 38, 38)';
    if (pct < 67) return 'rgb(234, 88, 12)';
    return 'rgb(34, 197, 94)';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
        <p className="text-gray-500">Monthly meter reading overview for {monthName}</p>
      </div>

      {/* Capture Progress % Graph - glass */}
      <div data-tour="capture-progress" className="liquid-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Capture Progress</h2>
          {!canSwitchBranches && (
            <span className="text-2xl font-bold" style={{ color: getProgressColor(progressPercent) }}>
              {progressPercent}%
            </span>
          )}
        </div>

        {canSwitchBranches ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Johannesburg (JHB)</span>
                <span className="text-lg font-bold" style={{ color: getProgressColor(jhbPercent) }}>{jhbPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(jhbPercent, 100)}%`, backgroundColor: getProgressColor(jhbPercent) }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{jhbSummary.capturedCount} of {jhbSummary.totalMachines} machines</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Cape Town (CT)</span>
                <span className="text-lg font-bold" style={{ color: getProgressColor(ctPercent) }}>{ctPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(ctPercent, 100)}%`, backgroundColor: getProgressColor(ctPercent) }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{ctSummary.capturedCount} of {ctSummary.totalMachines} machines</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercent, 100)}%`, backgroundColor: getProgressColor(progressPercent) }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {summary.capturedCount} of {summary.totalMachines} machines captured
            </p>
          </>
        )}
      </div>

      {/* Tiles */}
      <div data-tour="quick-actions" className="liquid-glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/capture"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <div className="p-3 bg-red-50 rounded-lg mr-4">
              <FileSpreadsheet className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Monthly Capture</p>
              <p className="text-sm text-gray-500">Capture meter readings</p>
            </div>
          </Link>

          <Link
            to="/history"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <div className="p-3 bg-green-50 rounded-lg mr-4">
              <History className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">History</p>
              <p className="text-sm text-gray-500">Past readings & export</p>
            </div>
          </Link>

          <Link
            to="/machines"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <div className="p-3 bg-blue-50 rounded-lg mr-4">
              <Printer className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Machines</p>
              <p className="text-sm text-gray-500">Manage machines</p>
            </div>
          </Link>

          {isAdmin && (
            <Link
              to="/import-readings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="p-3 bg-amber-50 rounded-lg mr-4">
                <Upload className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Import Readings</p>
                <p className="text-sm text-gray-500">Bulk import from CSV</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
