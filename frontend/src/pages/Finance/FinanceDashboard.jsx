import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { financeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/dateFormat';
import { formatZar } from './formatZar';
import BillingHistoryCharts from './BillingHistoryCharts';

export default function FinanceDashboard() {
  const { can, effectiveBranch } = useAuth();
  const canView = can('finance.billing.view');

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance', 'billing-history', effectiveBranch],
    queryFn: () => financeApi.getBillingHistory(effectiveBranch, { limit: 100 }),
    enabled: canView && Boolean(effectiveBranch),
  });

  if (!canView) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to Finance.
      </div>
    );
  }

  const runs = data?.runs ?? [];
  const total = data?.total ?? runs.length;
  const latest = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Billing import runs for the active branch</p>
        </div>
        <Link
          to="/finance/billing"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New billing run
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="tile-card p-4">
          <p className="text-sm text-gray-500">Saved runs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="tile-card p-4">
          <p className="text-sm text-gray-500">Latest period</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{latest?.period || '—'}</p>
        </div>
        <div className="tile-card p-4">
          <p className="text-sm text-gray-500">Latest grand total</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {latest ? formatZar(latest.grandTotal) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Full supplier cost</p>
        </div>
      </div>

      {runs.length > 0 ? <BillingHistoryCharts runs={runs} latest={latest} /> : null}

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error.response?.data?.error || 'Failed to load billing history'}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No billing runs yet.{' '}
            <Link to="/finance/billing" className="text-red-600 hover:underline">
              Start a new billing run
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clients</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <Link to={`/finance/billing/${run.id}`} className="text-red-600 hover:underline">
                      {run.period}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.processedBy}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.clientCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatZar(run.grandTotal)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
