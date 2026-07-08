import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import { fibreOrdersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MODULE_FIBRE_ORDERS } from '../../constants/modules';
import FibreStatusBadge from './FibreStatusBadge';

function formatWhen(d) {
  if (!d) return '';
  return new Date(d).toLocaleString();
}

export default function FibreOrderUpdateRequestsPanel() {
  const { isElevated, hasModule, effectiveBranch } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['fibre-orders', 'update-requests', effectiveBranch],
    queryFn: () => fibreOrdersApi.listUpdateRequests(effectiveBranch),
    enabled: isElevated && hasModule(MODULE_FIBRE_ORDERS),
    refetchInterval: 60_000,
  });

  if (!isElevated || !hasModule(MODULE_FIBRE_ORDERS)) {
    return null;
  }

  const requests = data?.requests ?? [];

  if (isLoading) {
    return (
      <div className="tile-card p-6 flex items-center justify-center text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="tile-card overflow-hidden border-l-4 border-l-amber-500">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-amber-50/60">
        <Bell className="h-4 w-4 text-amber-700" />
        <h2 className="font-semibold text-gray-900">
          Update requests
          <span className="ml-2 text-sm font-normal text-amber-800">({requests.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {requests.map((req) => (
          <li key={req.id}>
            <Link
              to={`/fibre-orders/${req.orderId}`}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {req.order?.customerName}
                </p>
                <p className="text-sm text-gray-500">
                  Requested by {req.requestedBy?.name} · {formatWhen(req.createdAt)}
                </p>
                {req.note && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">&ldquo;{req.note}&rdquo;</p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-1">
                {req.order?.pipelineStatus && (
                  <FibreStatusBadge
                    pipelineStatus={req.order.pipelineStatus}
                    overlayStatus={req.order.overlayStatus}
                  />
                )}
                <p className="text-xs text-red-600 font-medium">Review →</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
