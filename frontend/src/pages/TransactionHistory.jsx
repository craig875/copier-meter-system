import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/api';
import { 
  History, 
  Loader2, 
  User, 
  Calendar, 
  FileSpreadsheet,
  Printer,
  Unlock,
  Trash2,
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Upload,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const actionLabels = {
  reading_submit: { label: 'Saved readings', icon: FileSpreadsheet, color: 'green' },
  reading_export: { label: 'Exported Excel', icon: Download, color: 'blue' },
  reading_export_all_branches: { label: 'Exported all branches', icon: Download, color: 'blue' },
  reading_unlock: { label: 'Unlocked month', icon: Unlock, color: 'amber' },
  reading_delete: { label: 'Deleted reading', icon: Trash2, color: 'red' },
  reading_import: { label: 'Imported readings', icon: Upload, color: 'blue' },
  machine_create: { label: 'Added machine', icon: Plus, color: 'green' },
  machine_update: { label: 'Updated machine', icon: Pencil, color: 'blue' },
  machine_delete: { label: 'Deleted machine', icon: Trash2, color: 'red' },
  machine_decommission: { label: 'Decommissioned machine', icon: Archive, color: 'amber' },
  machine_recommission: { label: 'Recommissioned machine', icon: RotateCcw, color: 'green' },
  machine_import: { label: 'Imported machines', icon: Upload, color: 'blue' },
  user_create: { label: 'Created user', icon: User, color: 'green' },
  user_update: { label: 'Updated user', icon: User, color: 'blue' },
  user_delete: { label: 'Deleted user', icon: Trash2, color: 'red' },
};

const formatDetails = (action, details) => {
  if (!details || typeof details !== 'object') return '';
  const parts = [];
  if (details.year && details.month) parts.push(`${details.year}/${details.month}`);
  if (details.branch) parts.push(details.branch);
  if (details.serialNumber) parts.push(details.serialNumber);
  if (details.savedCount != null) parts.push(`${details.savedCount} saved`);
  if (details.created != null) parts.push(`${details.created} created`);
  if (details.updated != null) parts.push(`${details.updated} updated`);
  if (details.email) parts.push(details.email);
  return parts.join(' • ');
};

const TransactionHistory = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-history'],
    queryFn: () => auditApi.getHistory(),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading transaction history: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-500">View who made what changes in the system</p>
      </div>

      <div className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No transaction history yet. Actions will appear here as users make changes.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const config = actionLabels[log.action] || { label: log.action, icon: History, color: 'gray' };
                  const Icon = config.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{log.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{log.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                          config.color === 'green' && 'bg-green-100 text-green-700',
                          config.color === 'blue' && 'bg-blue-100 text-blue-700',
                          config.color === 'red' && 'bg-red-100 text-red-700',
                          config.color === 'amber' && 'bg-amber-100 text-amber-700',
                          config.color === 'gray' && 'bg-gray-100 text-gray-700'
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDetails(log.action, log.details)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 border-t">
            Showing {logs.length} of {total} entries
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
