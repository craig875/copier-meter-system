import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { readingsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Printer, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { effectiveBranch } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: readingsData, isLoading } = useQuery({
    queryKey: ['readings', currentYear, currentMonth, effectiveBranch],
    queryFn: () => readingsApi.get(currentYear, currentMonth, false, effectiveBranch),
  });

  // Backend returns: { year, month, data, summary, ... }
  // Axios wraps it: { data: { year, month, data, summary, ... }, status, ... }
  // React Query's data is the axios response, so readingsData.data is: { year, month, data, summary, ... }
  const summary = readingsData?.data?.summary || {
    totalMachines: 0,
    capturedCount: 0,
    pendingCount: 0,
  };

  const progressPercent = summary.totalMachines > 0 
    ? Math.round((summary.capturedCount / summary.totalMachines) * 100)
    : 0;

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Monthly meter reading overview for {monthName}</p>
        </div>
        <Link
          to="/capture"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Continue Capture
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* Progress Card - glass */}
      <div data-tour="capture-progress" className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Capture Progress</h2>
          <span className={`text-2xl font-bold ${progressPercent === 100 ? 'text-green-600' : 'text-red-600'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-green-600' : 'bg-red-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {summary.capturedCount} of {summary.totalMachines} machines captured
        </p>
      </div>

      {/* Stats Grid */}
      <div data-tour="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Machines"
          value={summary.totalMachines}
          icon={Printer}
          color="dark"
        />
        <StatCard
          title="Captured"
          value={summary.capturedCount}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Pending"
          value={summary.pendingCount}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="% Captured"
          value={`${progressPercent}%`}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Quick Actions - glass */}
      <div data-tour="quick-actions" className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/capture"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <div className="p-3 bg-gray-900 rounded-lg mr-4">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Enter Readings</p>
              <p className="text-sm text-gray-500">Capture meter readings</p>
            </div>
          </Link>

          <Link
            to="/history"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View History</p>
              <p className="text-sm text-gray-500">Past readings & export</p>
            </div>
          </Link>

          {summary.pendingCount > 0 && (
            <Link
              to="/capture"
              className="flex items-center p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:border-yellow-300 transition-colors"
            >
              <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{summary.pendingCount} Pending</p>
                <p className="text-sm text-gray-500">Complete capture</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    dark: 'bg-gray-900 text-white',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
