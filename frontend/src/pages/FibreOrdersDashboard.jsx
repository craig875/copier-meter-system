import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, List, Package, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { fibreOrdersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fibreOrderQueryParams } from '../utils/fibreOrderQuery';
import { ALMOST_COMPLETE_STATUSES, formatWeeksRemaining } from '../constants/fibreOrders';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import FibreStatusBadge from '../components/fibre/FibreStatusBadge';
import FibreOrderUpdateRequestsPanel from '../components/fibre/FibreOrderUpdateRequestsPanel';

export default function FibreOrdersDashboard() {
  const { hasModule, isElevated, isSalesAgent, effectiveBranch } = useAuth();

  const branchScope = { effectiveBranch, isSalesAgent };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['fibre-orders', 'stats', effectiveBranch, isSalesAgent],
    queryFn: () => fibreOrdersApi.getStats(
      isSalesAgent ? undefined : effectiveBranch
    ),
    enabled: hasModule(MODULE_FIBRE_ORDERS),
  });

  const listParams = useMemo(
    () => fibreOrderQueryParams(branchScope, { activeOnly: 'true' }),
    [effectiveBranch, isSalesAgent]
  );

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['fibre-orders', 'list', 'active', listParams],
    queryFn: () => fibreOrdersApi.list(listParams),
    enabled: hasModule(MODULE_FIBRE_ORDERS),
  });

  if (!hasModule(MODULE_FIBRE_ORDERS)) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to the Fibre Orders module.
      </div>
    );
  }

  const orders = ordersData?.orders ?? [];
  const recent = orders.slice(0, 5);

  const almostComplete = ALMOST_COMPLETE_STATUSES.reduce(
    (sum, status) => sum + (stats?.byStatus?.[status] ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fibre Orders</h1>
          <p className="text-gray-500 mt-1">
            {isSalesAgent
              ? 'View fibre orders assigned to you (read-only)'
              : 'Track customer fibre orders, ETAs, and installation progress'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/fibre-orders/list"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <List className="h-4 w-4 mr-2" />
            Active Orders
          </Link>
          <Link
            to="/fibre-orders/completed"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
            {stats?.completed != null && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {stats.completed}
              </span>
            )}
          </Link>
          {isElevated && (
            <>
              <Link
                to="/fibre-orders/products"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Products
              </Link>
              <Link
                to="/fibre-orders/new"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Link>
            </>
          )}
        </div>
      </div>

      <FibreOrderUpdateRequestsPanel />

      {(isElevated || isSalesAgent) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
            ))
          ) : (
            <>
              {(stats?.pendingUpdateRequests ?? 0) > 0 && isElevated && (
                <div className="sm:col-span-3 tile-card p-4 border-l-4 border-l-amber-500 bg-amber-50/50 flex items-center justify-between gap-3">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">{stats.pendingUpdateRequests}</span> sales agent update
                    {stats.pendingUpdateRequests === 1 ? ' request' : ' requests'} awaiting review
                  </p>
                </div>
              )}
              <div className="tile-card p-5">
                <p className="text-sm text-gray-500">{isSalesAgent ? 'My Active Orders' : 'Active Orders'}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total ?? 0}</p>
              </div>
              <div className="tile-card p-5 border-l-4 border-l-amber-500">
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Orders Overdue
                </p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{stats?.overdue ?? 0}</p>
              </div>
              <div className="tile-card p-5 border-l-4 border-l-green-500">
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Almost Complete
                </p>
                <p className="text-3xl font-bold text-green-700 mt-1">{almostComplete}</p>
                <p className="text-xs text-gray-400 mt-1">Wayleave approved or scheduled</p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="tile-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Active Orders</h2>
          <Link to="/fibre-orders/list" className="text-sm text-red-600 hover:text-red-700">
            View all
          </Link>
        </div>
        {ordersLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No active orders.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((order) => (
              <Link
                key={order.id}
                to={`/fibre-orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{order.customerName}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {order.product?.name} · {order.branch}
                    {order.customerReference ? ` · ${order.customerReference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {order.isOverdue && (
                    <span className="text-xs text-amber-700 font-medium">
                      {formatWeeksRemaining(order.weeksRemaining)}
                    </span>
                  )}
                  <FibreStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
