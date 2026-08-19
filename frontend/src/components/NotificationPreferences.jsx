import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationsApi } from '../services/api';

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ category, enabled }) => notificationsApi.setPreference({ category, enabled }),
    onSuccess: (res) => {
      queryClient.setQueryData(['notifications', 'preferences'], res);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Could not save preference');
    },
  });

  const categories = data?.categories || [];
  if (isLoading) {
    return (
      <div className="liquid-glass rounded-xl p-6 text-sm text-gray-500">Loading preferences…</div>
    );
  }
  if (categories.length === 0) return null;

  return (
    <div className="liquid-glass rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900">Notification preferences</h2>
      <p className="text-sm text-gray-500 mt-1">
        Choose which alerts you receive. Everything stays on until you turn a category off.
      </p>
      <ul className="mt-4 divide-y divide-gray-100">
        {categories.map((cat) => (
          <li key={cat.category} className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{cat.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cat.enabled}
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ category: cat.category, enabled: !cat.enabled })}
              className={
                cat.enabled
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full bg-red-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full bg-gray-300 transition-colors'
              }
            >
              <span
                className={
                  cat.enabled
                    ? 'inline-block h-5 w-5 translate-x-5 rounded-full bg-white mt-0.5 transition'
                    : 'inline-block h-5 w-5 translate-x-1 rounded-full bg-white mt-0.5 transition'
                }
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
