import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Loader2,
  MessageSquare,
  Package,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const Notifications = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
    enabled: !!isAdmin,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
  });

  const notifications = data?.notifications || [];

  const handleNotificationClick = (n) => {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    if (n.linkUrl) {
      const path = n.linkUrl.startsWith('/') ? n.linkUrl : `/${n.linkUrl}`;
      navigate(path);
    }
  };

  if (!isAdmin) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Access denied. Notifications are for administrators only.</p>
        <Link to="/" className="text-red-600 hover:underline mt-2 inline-block">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Failed to load notifications.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            Alerts when part orders are captured and when notes are added to readings
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="liquid-glass rounded-xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No notifications yet.</p>
            <p className="text-sm mt-1">
              When part orders are captured or notes are added to readings, you&apos;ll see them here. Click to open.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={clsx(
                  'w-full text-left px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors',
                  !n.readAt && 'bg-red-50/50'
                )}
              >
                <div
                  className={clsx(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                    !n.readAt ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {n.type === 'part_order_captured' ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-medium', !n.readAt ? 'text-gray-900' : 'text-gray-700')}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-sm text-gray-600 mt-0.5 truncate">{n.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
