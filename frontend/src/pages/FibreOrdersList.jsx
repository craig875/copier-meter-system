import { useMemo, useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { fibreOrdersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fibreOrderQueryParams } from '../utils/fibreOrderQuery';
import { ACTIVE_PIPELINE_STATUSES, formatWeeksRemaining, isActiveFibreOrder } from '../constants/fibreOrders';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import FibreStatusBadge from '../components/fibre/FibreStatusBadge';
import FibreOrderProgressBar from '../components/fibre/FibreOrderProgressBar';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function FibreOrdersList() {
  const { hasModule, isElevated, isSalesAgent, effectiveBranch } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params = useMemo(() => {
    const extra = { activeOnly: 'true' };
    if (statusFilter) {
      extra.pipelineStatus = statusFilter;
      delete extra.activeOnly;
    }
    if (search.trim()) extra.search = search.trim();
    return fibreOrderQueryParams({ effectiveBranch, isSalesAgent }, extra);
  }, [effectiveBranch, isSalesAgent, statusFilter, search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['fibre-orders', 'list', params],
    queryFn: () => fibreOrdersApi.list(params),
    enabled: hasModule(MODULE_FIBRE_ORDERS),
  });

  if (!hasModule(MODULE_FIBRE_ORDERS)) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to the Fibre Orders module.
      </div>
    );
  }

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSalesAgent ? 'My Active Fibre Orders' : 'Active Fibre Orders'}
          </h1>
          <p className="text-gray-500 mt-1">{orders.length} active order(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/fibre-orders/completed"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Completed Installs
          </Link>
          {isElevated && (
          <Link
            to="/fibre-orders/new"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer, reference, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">All active statuses</option>
          {ACTIVE_PIPELINE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load orders.</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders match your filters.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/fibre-orders/${order.id}`} className="font-medium text-red-600 hover:text-red-700">
                        {order.customerName}
                      </Link>
                      {order.customerReference && (
                        <p className="text-xs text-gray-500">{order.customerReference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.product?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.branch}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.orderPlacementDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={order.isOverdue ? 'text-amber-700 font-medium' : 'text-gray-700'}>
                        {formatDate(order.expectedInstallDate)}
                        {order.isOverdue && (
                          <span className="block text-xs">({formatWeeksRemaining(order.weeksRemaining)})</span>
                        )}
                        {!order.isOverdue && order.weeksRemaining > 0 && isActiveFibreOrder(order) && (
                          <span className="block text-xs text-gray-500">({formatWeeksRemaining(order.weeksRemaining)})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <FibreStatusBadge
                        pipelineStatus={order.pipelineStatus}
                        overlayStatus={order.overlayStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.salesAgent?.name}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td colSpan={7} className="px-4 pb-3 pt-0">
                      <FibreOrderProgressBar
                        pipelineStatus={order.pipelineStatus}
                        overlayStatus={order.overlayStatus}
                      />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
