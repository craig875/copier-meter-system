import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle } from 'lucide-react';
import { fibreOrdersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fibreOrderQueryParams } from '../utils/fibreOrderQuery';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import FibreStatusBadge from '../components/fibre/FibreStatusBadge';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function FibreOrdersCompleted() {
  const { hasModule, isSalesAgent, effectiveBranch } = useAuth();
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => fibreOrderQueryParams(
      { effectiveBranch, isSalesAgent },
      {
        completedOnly: 'true',
        ...(search.trim() ? { search: search.trim() } : {}),
      }
    ),
    [effectiveBranch, isSalesAgent, search]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['fibre-orders', 'completed', params],
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
          <Link
            to="/fibre-orders"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-7 w-7 text-green-600" />
            Completed Installs
          </h1>
          <p className="text-gray-500 mt-1">
            {isSalesAgent ? 'Your ' : ''}{orders.length} completed install(s)
          </p>
        </div>
        <Link
          to="/fibre-orders/list"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Active Orders
        </Link>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customer, reference, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load completed orders.</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No completed installs yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Install ETA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
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
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.expectedInstallDate)}</td>
                  <td className="px-4 py-3"><FibreStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{order.salesAgent?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
