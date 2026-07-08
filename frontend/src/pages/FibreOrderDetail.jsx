import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Loader2, Globe, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { fibreOrdersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUSES, STATUS_BORDER_STYLES, formatWeeksRemaining } from '../constants/fibreOrders';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import FibreStatusBadge from '../components/fibre/FibreStatusBadge';
import FibreOrderCompleteModal from '../components/fibre/FibreOrderCompleteModal';
import {
  fibreOrderToConnectivityPrefill,
  isConnectivityPromptDismissed,
  dismissConnectivityPrompt,
} from '../utils/fibreOrderConnectivity';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function FibreOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasModule, isElevated, isSalesAgent, canManageConnectivity } = useAuth();
  const [newStatus, setNewStatus] = useState('');
  const [noteText, setNoteText] = useState('');
  const [completeModalOrder, setCompleteModalOrder] = useState(null);
  const [showInstalledBanner, setShowInstalledBanner] = useState(false);
  const [requestNote, setRequestNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['fibre-orders', id],
    queryFn: () => fibreOrdersApi.get(id),
    enabled: hasModule(MODULE_FIBRE_ORDERS) && !!id,
  });

  const { data: updatesData } = useQuery({
    queryKey: ['fibre-orders', id, 'updates'],
    queryFn: () => fibreOrdersApi.getUpdates(id),
    enabled: hasModule(MODULE_FIBRE_ORDERS) && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => fibreOrdersApi.update(id, payload),
    onSuccess: (result, variables) => {
      toast.success('Order updated');
      setNewStatus('');
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', id, 'updates'] });
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', 'stats'] });
      if (variables.status === 'complete') {
        setCompleteModalOrder(result.order);
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  const requestUpdateMutation = useMutation({
    mutationFn: () => fibreOrdersApi.requestUpdate(id, requestNote.trim() || null),
    onSuccess: () => {
      toast.success('Update requested — your manager has been notified');
      setRequestNote('');
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', 'update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['fibre-orders', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not send request'),
  });

  const order = data?.order;

  useEffect(() => {
    if (order?.status === 'complete' && !isConnectivityPromptDismissed(order.id)) {
      setShowInstalledBanner(true);
    } else {
      setShowInstalledBanner(false);
    }
  }, [order?.status, order?.id]);

  if (!hasModule(MODULE_FIBRE_ORDERS)) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to the Fibre Orders module.
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

  if (error || !order) {
    return (
      <div className="tile-card p-6 text-center text-red-600">
        Order not found or failed to load.
        <button onClick={() => navigate('/fibre-orders/list')} className="block mx-auto mt-4 text-red-600 underline">
          Back to list
        </button>
      </div>
    );
  }

  const updates = updatesData?.updates ?? [];
  const latestStatusUpdate = updates.find(
    (u) => u.newStatus && u.previousStatus !== u.newStatus
  );
  const statusWillChange = newStatus && newStatus !== order.status;
  const hasNote = Boolean(noteText.trim());
  const canSubmit = statusWillChange || hasNote;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {};
    if (statusWillChange) payload.status = newStatus;
    if (hasNote) payload.note = noteText.trim();
    updateMutation.mutate(payload);
  };

  const handleAddConnectivityFromBanner = () => {
    dismissConnectivityPrompt(order.id);
    setShowInstalledBanner(false);
    navigate('/connectivity/targets/new', {
      state: { fromFibreOrder: fibreOrderToConnectivityPrefill(order) },
    });
  };

  return (
    <div className="space-y-6">
      {completeModalOrder && (
        <FibreOrderCompleteModal
          order={completeModalOrder}
          canAddConnectivity={canManageConnectivity}
          onClose={() => setCompleteModalOrder(null)}
        />
      )}

      {showInstalledBanner && canManageConnectivity && (
        <div className="tile-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4 border-green-400 bg-green-50/80">
          <div>
            <p className="font-medium text-gray-900">This order is complete</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Add this site to Connectivity Monitoring to start tracking the live link.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddConnectivityFromBanner}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Globe className="h-4 w-4" />
              Add monitoring target
            </button>
            <button
              type="button"
              onClick={() => {
                dismissConnectivityPrompt(order.id);
                setShowInstalledBanner(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-sm text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link to="/fibre-orders/list" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{order.customerName}</h1>
          <p className="text-gray-500">{order.customerReference || 'No reference'}</p>
          {isSalesAgent && (
            <p className="text-xs text-gray-400 mt-1">Read-only — contact an administrator to update this order</p>
          )}
        </div>
        <FibreStatusBadge status={order.status} className="text-sm" />
        {isElevated && (
          <Link
            to={`/fibre-orders/${id}/edit`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="tile-card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Order Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Product</dt>
                <dd className="font-medium text-gray-900">{order.product?.name} ({order.product?.productType})</dd>
              </div>
              <div>
                <dt className="text-gray-500">Branch</dt>
                <dd className="font-medium text-gray-900">{order.branch}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Sales Agent</dt>
                <dd className="font-medium text-gray-900">{order.salesAgent?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Order Placed</dt>
                <dd className="font-medium text-gray-900">{formatDate(order.orderPlacementDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Expected Install</dt>
                <dd className={`font-medium ${order.isOverdue ? 'text-amber-700' : 'text-gray-900'}`}>
                  {formatDate(order.expectedInstallDate)}
                  {order.isOverdue && ` (${formatWeeksRemaining(order.weeksRemaining)})`}
                  {!order.isOverdue && order.weeksRemaining > 0 && order.status !== 'complete' && order.status !== 'cancelled' && (
                    ` (${formatWeeksRemaining(order.weeksRemaining)})`
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Installation Address</dt>
                <dd className="font-medium text-gray-900">{order.installationAddress}</dd>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-gray-900">{order.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="tile-card overflow-hidden">
            <div
              className={clsx(
                'px-5 py-4 border-l-4',
                STATUS_BORDER_STYLES[order.status] ?? 'border-gray-300 bg-gray-50/80'
              )}
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Current status
              </p>
              <FibreStatusBadge status={order.status} className="text-sm px-3 py-1" />
              {latestStatusUpdate && (
                <p className="text-xs text-gray-500 mt-2">
                  Updated {formatDateTime(latestStatusUpdate.createdAt)}
                  {latestStatusUpdate.updatedBy?.name ? ` · ${latestStatusUpdate.updatedBy.name}` : ''}
                </p>
              )}
            </div>
            <div className="p-6 pt-4">
              <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
              {updates.length === 0 ? (
                <p className="text-gray-500 text-sm">No updates yet.</p>
              ) : (
                <ul className="space-y-4">
                  {updates.map((u) => (
                    <li key={u.id} className="border-l-2 border-gray-200 pl-4">
                      <p className="text-sm text-gray-500">{formatDateTime(u.createdAt)} · {u.updatedBy?.name}</p>
                      {u.previousStatus !== u.newStatus && u.newStatus && (
                        <p className="text-sm font-medium text-gray-800 mt-0.5">
                          Status: {u.previousStatus ? `${u.previousStatus.replace(/_/g, ' ')} → ` : ''}
                          {u.newStatus.replace(/_/g, ' ')}
                        </p>
                      )}
                      {u.note && <p className="text-sm text-gray-700 mt-1">{u.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {isElevated && (
          <div className="tile-card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Update Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Keep current status ({ORDER_STATUSES.find((s) => s.value === order.status)?.label})</option>
                  {ORDER_STATUSES.filter((s) => s.value !== order.status).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Optional note for the timeline..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={!canSubmit || updateMutation.isPending}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Update'}
              </button>
              <p className="text-xs text-gray-500">
                Change the status, add a note, or both — saved as one timeline entry.
              </p>
            </form>
          </div>
        )}

        {isSalesAgent && (
          <div className="tile-card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Request an update
            </h2>
            {order.pendingUpdateRequest ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
                <p className="font-medium text-amber-900">Update requested</p>
                <p className="text-amber-800 mt-1">
                  Your manager has been notified. Check the timeline for responses.
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Sent {formatDateTime(order.pendingUpdateRequest.createdAt)}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Ask your manager to post a status update on this order.
                </p>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={3}
                  placeholder="Optional message (e.g. client asking for ETA)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => requestUpdateMutation.mutate()}
                  disabled={requestUpdateMutation.isPending}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {requestUpdateMutation.isPending ? 'Sending...' : 'Request for update'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
