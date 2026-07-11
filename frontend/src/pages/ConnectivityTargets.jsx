import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { buildFromState } from '../utils/navigationFrom';
import { Plus, Pencil, Trash2, Power, PowerOff, Eye } from 'lucide-react';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/connectivity/StatusBadge';

export default function ConnectivityTargets() {
  const location = useLocation();
  const { canManageConnectivity, effectiveBranch } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['connectivity', 'targets', effectiveBranch],
    queryFn: () => connectivityApi.getTargets({ branch: effectiveBranch }),
    enabled: !!canManageConnectivity,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => connectivityApi.deleteTarget(id, effectiveBranch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connectivity'] }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => connectivityApi.setTargetStatus(id, status, effectiveBranch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connectivity'] }),
  });

  if (!canManageConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">Admin access required to manage targets.</div>
    );
  }
  if (isLoading) return <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />;
  const targets = data?.targets ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Monitoring Targets</h1>
        <div className="flex gap-2">
          <Link to="/connectivity/targets/new" state={buildFromState(location)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Target
          </Link>
        </div>
      </div>
      <div className="tile-card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Circuit No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FNO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monitoring</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {targets.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No targets. Add one to get started.</td></tr>
            ) : (
              targets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/connectivity/targets/${t.id}`}
                    state={buildFromState(location)} className="text-blue-600 hover:underline">{t.customerName}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/connectivity/targets/${t.id}`}
                    state={buildFromState(location)} className="text-blue-600 hover:underline">{t.siteName}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{t.supplier || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{t.circuitNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.fno || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    <Link to={`/connectivity/targets/${t.id}`}
                    state={buildFromState(location)} className="text-blue-600 hover:underline">{t.monitoringTarget}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{t.serviceType}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.currentStatus} /></td>
                  <td className="px-4 py-3"><span className={t.status === 'enabled' ? 'text-green-600' : 'text-gray-400'}>{t.status === 'enabled' ? 'Enabled' : 'Disabled'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => statusMutation.mutate({ id: t.id, status: t.status === 'enabled' ? 'disabled' : 'enabled' })} className="p-2 text-gray-500 hover:text-gray-700 mr-1" title={t.status === 'enabled' ? 'Disable' : 'Enable'}>
                      {t.status === 'enabled' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <Link to={`/connectivity/targets/${t.id}`}
                    state={buildFromState(location)} className="p-2 text-gray-500 hover:text-blue-600 inline-block" title="View"><Eye className="h-4 w-4" /></Link>
                    <Link to={`/connectivity/targets/${t.id}/edit`}
                    state={buildFromState(location)} className="p-2 text-gray-500 hover:text-blue-600 inline-block" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    <button onClick={() => { if (window.confirm('Delete this target?')) deleteMutation.mutate(t.id); }} className="p-2 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
