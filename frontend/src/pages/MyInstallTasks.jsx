import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { installationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { buildFromState } from '../utils/navigationFrom';
import {
  INSTALL_TASK_STATUS_BADGE,
  installTaskStatusLabel,
  nextInstallTaskStatuses,
} from '../constants/installTasks';

export default function MyInstallTasks() {
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['installations', 'my-tasks'],
    queryFn: () => installationsApi.listMyTasks(),
    enabled: Boolean(user),
  });

  const statusMutation = useMutation({
    mutationFn: ({ installId, taskId, status }) =>
      installationsApi.updateTaskStatus(installId, taskId, status),
    onSuccess: () => {
      toast.success('Task status updated');
      queryClient.invalidateQueries({ queryKey: ['installations', 'my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['installations'] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not update status'),
  });

  const tasks = data?.tasks ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Install Tasks</h1>
        <p className="text-gray-500 mt-1">
          Tasks assigned to you across installations ({tasks.length})
        </p>
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load your tasks.</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tasks assigned to you.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Installation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const nextStatuses = nextInstallTaskStatuses(task.status);
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {task.install ? (
                        <Link
                          to={`/installations/${task.install.id}`}
                          state={buildFromState(location)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          {task.install.customerName}
                        </Link>
                      ) : (
                        '—'
                      )}
                      {task.install?.siteName && (
                        <p className="text-xs text-gray-500">{task.install.siteName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          INSTALL_TASK_STATUS_BADGE[task.status] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {installTaskStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nextStatuses.length === 0 ? (
                        <span className="text-sm text-gray-400">—</span>
                      ) : (
                        <select
                          defaultValue=""
                          disabled={statusMutation.isPending}
                          onChange={(e) => {
                            const status = e.target.value;
                            if (!status) return;
                            statusMutation.mutate({
                              installId: task.installId,
                              taskId: task.id,
                              status,
                            });
                            e.target.value = '';
                          }}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                        >
                          <option value="">Update...</option>
                          {nextStatuses.map((s) => (
                            <option key={s.value} value={s.value}>
                              Mark {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
