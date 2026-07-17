import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { installationsApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  INSTALL_TASK_STATUS_BADGE,
  installTaskStatusLabel,
  nextInstallTaskStatuses,
} from '../../constants/installTasks';
import { trimLeading } from '../../utils/string';

function emptyForm() {
  return { title: '', description: '', assignedToId: '' };
}

export default function InstallTasksPanel({ installId, tasks: initialTasks = [] }) {
  const { user, isElevated } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: isElevated,
  });

  const users = usersData?.users ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['installations', installId] });
    queryClient.invalidateQueries({ queryKey: ['installations', installId, 'tasks'] });
    queryClient.invalidateQueries({ queryKey: ['installations', installId, 'updates'] });
    queryClient.invalidateQueries({ queryKey: ['installations', 'my-tasks'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => installationsApi.createTask(installId, payload),
    onSuccess: () => {
      toast.success('Task created');
      setForm(emptyForm());
      setShowAdd(false);
      invalidate();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }) => installationsApi.updateTask(installId, taskId, payload),
    onSuccess: () => {
      toast.success('Task updated');
      setEditingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not update task'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      installationsApi.updateTaskStatus(installId, taskId, status),
    onSuccess: () => {
      toast.success('Task status updated');
      invalidate();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId) => installationsApi.deleteTask(installId, taskId),
    onSuccess: () => {
      toast.success('Task deleted');
      invalidate();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not delete task'),
  });

  const tasks = initialTasks;

  const canActOnStatus = (task) =>
    isElevated || task.assignedToId === user?.id;

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      assignedToId: task.assignedToId || '',
    });
  };

  return (
    <div className="tile-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Tasks</h2>
        {isElevated && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center text-sm text-red-600 hover:text-red-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add task
          </button>
        )}
      </div>

      {isElevated && showAdd && (
        <form
          className="space-y-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim() || !form.assignedToId) {
              toast.error('Title and assignee are required');
              return;
            }
            createMutation.mutate({
              title: form.title.trim(),
              description: form.description.trim() || null,
              assignedToId: form.assignedToId,
            });
          }}
        >
          <input
            type="text"
            placeholder="Task name *"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: trimLeading(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: trimLeading(e.target.value) }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={form.assignedToId}
            onChange={(e) => setForm((p) => ({ ...p, assignedToId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          >
            <option value="">Assign to...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setForm(emptyForm());
              }}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No tasks yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => {
            const nextStatuses = nextInstallTaskStatuses(task.status);
            const isEditing = editingId === task.id;

            return (
              <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                {isEditing ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate({
                        taskId: task.id,
                        payload: {
                          title: editForm.title.trim(),
                          description: editForm.description.trim() || null,
                          assignedToId: editForm.assignedToId,
                        },
                      });
                    }}
                  >
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, title: trimLeading(e.target.value) }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          description: trimLeading(e.target.value),
                        }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={editForm.assignedToId}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, assignedToId: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">
                          {task.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {task.assignedTo?.name || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          INSTALL_TASK_STATUS_BADGE[task.status] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {installTaskStatusLabel(task.status)}
                      </span>
                      {canActOnStatus(task) && nextStatuses.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const status = e.target.value;
                            if (!status) return;
                            statusMutation.mutate({ taskId: task.id, status });
                            e.target.value = '';
                          }}
                          disabled={statusMutation.isPending}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                        >
                          <option value="">Update status...</option>
                          {nextStatuses.map((s) => (
                            <option key={s.value} value={s.value}>
                              Mark {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {isElevated && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            className="p-1.5 text-gray-500 hover:text-gray-800"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete this task?')) {
                                deleteMutation.mutate(task.id);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {statusMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
