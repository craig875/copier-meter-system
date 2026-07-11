import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { readingsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { trimLeading } from '../../utils/string';

function ForceApproveModal({ entry, isSubmitting, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  if (!entry) return null;

  const machine = entry.machine;
  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="popup-panel max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-violet-100 shrink-0">
              <ShieldAlert className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Force-approve Unable to obtain</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {machine.machineSerialNumber}
                {machine.customer?.name ? ` — ${machine.customer.name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit || isSubmitting) return;
            onConfirm(trimmed);
          }}
          className="p-4 space-y-4"
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 space-y-1">
            <p className="font-medium">Previous month was also Unable to obtain</p>
            {(entry.previousReading?.unableToReadReason || entry.previousUnableToReadReason) && (
              <p className="text-xs text-amber-800">
                Prior reason:{' '}
                {entry.previousReading?.unableToReadReason || entry.previousUnableToReadReason}
              </p>
            )}
            {entry.pendingRequest?.requestedBy?.name && (
              <p className="text-xs text-amber-800">
                Requested by {entry.pendingRequest.requestedBy.name}
                {entry.pendingRequest.note ? ` — “${entry.pendingRequest.note}”` : ''}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="u2o-override-reason" className="block text-sm font-medium text-gray-900">
              Override reason (required)
            </label>
            <p className="text-xs text-gray-600">
              This writes the Unable to obtain reading for this month and is audited.
            </p>
            <textarea
              id="u2o-override-reason"
              value={reason}
              onChange={(e) => setReason(trimLeading(e.target.value))}
              placeholder="e.g. Site still inaccessible; confirmed with customer"
              maxLength={500}
              rows={3}
              autoFocus
              className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="px-4 py-2 bg-violet-700 text-white rounded-lg hover:bg-violet-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Force-approve and save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UnableToObtainOverrides() {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const urlYear = searchParams.get('year');
  const urlMonth = searchParams.get('month');
  const highlightMachineId = searchParams.get('machineId');
  const [year, setYear] = useState(urlYear ? parseInt(urlYear, 10) : now.getFullYear());
  const [month, setMonth] = useState(urlMonth ? parseInt(urlMonth, 10) : now.getMonth() + 1);
  const [modalEntry, setModalEntry] = useState(null);

  useEffect(() => {
    if (urlYear && urlMonth) {
      const y = parseInt(urlYear, 10);
      const m = parseInt(urlMonth, 10);
      if (!Number.isNaN(y) && y >= 2000 && y <= 2100) setYear(y);
      if (!Number.isNaN(m) && m >= 1 && m <= 12) setMonth(m);
    }
  }, [urlYear, urlMonth]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['unable-to-obtain-blocked', year, month, effectiveBranch],
    queryFn: () => readingsApi.listUnableToObtainBlocked(year, month),
    enabled: !!year && !!month && effectiveBranch != null,
  });

  const payload = data?.data;
  const blocked = payload?.blocked || [];
  const pendingRequests = payload?.pendingRequests || [];
  const isLocked = !!payload?.isLocked;

  useEffect(() => {
    if (!highlightMachineId || blocked.length === 0) return;
    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-override-machine-id="${highlightMachineId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightMachineId, blocked, pendingRequests]);

  const overrideMutation = useMutation({
    mutationFn: ({ machineId, reason }) =>
      readingsApi.forceUnableToObtainOverride({ year, month, machineId, reason }),
    onSuccess: (response) => {
      const serial = response.data?.machine?.machineSerialNumber || 'machine';
      toast.success(`Override saved for ${serial}`);
      setModalEntry(null);
      queryClient.invalidateQueries(['unable-to-obtain-blocked', year, month, effectiveBranch]);
      queryClient.invalidateQueries(['readings', year, month, effectiveBranch]);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save override');
    },
  });

  const monthName = useMemo(
    () => new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
    [year, month],
  );

  const openForceApprove = (machineId) => {
    const fromBlocked = blocked.find((e) => e.machine.id === machineId);
    if (fromBlocked) {
      setModalEntry(fromBlocked);
      return;
    }
    const fromPending = pendingRequests.find((r) => r.machine.id === machineId);
    if (fromPending && fromPending.isStillBlocked) {
      setModalEntry({
        machine: fromPending.machine,
        previousReading: {
          unableToReadReason: fromPending.previousUnableToReadReason,
        },
        previousUnableToReadReason: fromPending.previousUnableToReadReason,
        pendingRequest: {
          id: fromPending.id,
          note: fromPending.note,
          requestedBy: fromPending.requestedBy,
        },
      });
    }
  };

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSearchParams({ year: String(newYear), month: String(newMonth) });
    setModalEntry(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error loading blocked machines</p>
          <p className="text-gray-600 text-sm">
            {error?.response?.data?.error || error?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unable to Obtain Overrides</h1>
          <p className="text-gray-500">
            Machines blocked from consecutive Unable to obtain for {monthName}
          </p>
          {isLocked && (
            <div className="mt-2 flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This month is locked. Unlock it from Monthly Capture before force-approving.
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center liquid-glass rounded-lg">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-l-lg"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 font-medium min-w-[160px] text-center">{monthName}</span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Link
            to={`/capture?year=${year}&month=${month}`}
            className="text-sm text-red-700 hover:underline"
          >
            Open Capture
          </Link>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="liquid-glass rounded-xl overflow-hidden border-l-4 border-l-amber-500">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-amber-50/60">
            <Bell className="h-4 w-4 text-amber-700" />
            <h2 className="font-semibold text-gray-900">
              Manager requests
              <span className="ml-2 text-sm font-normal text-amber-800">
                ({pendingRequests.length})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {pendingRequests.map((req) => (
              <li
                key={req.id}
                data-override-machine-id={req.machine.id}
                className={clsx(
                  highlightMachineId === req.machine.id && 'bg-violet-50 ring-2 ring-inset ring-violet-300',
                )}
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {req.machine.machineSerialNumber}
                      {req.machine.customer?.name ? ` — ${req.machine.customer.name}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested by {req.requestedBy?.name || 'manager'}
                      {' · '}
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                    {req.note && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">&ldquo;{req.note}&rdquo;</p>
                    )}
                    {req.previousUnableToReadReason && (
                      <p className="text-xs text-amber-800 mt-1">
                        Prior U2O: {req.previousUnableToReadReason}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {req.isStillBlocked ? (
                      <button
                        type="button"
                        disabled={isLocked || overrideMutation.isPending}
                        onClick={() => openForceApprove(req.machine.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-violet-700 rounded-lg hover:bg-violet-800 disabled:opacity-50"
                      >
                        Force-approve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">Already captured</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="liquid-glass rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {blocked.length === 0
              ? 'No machines currently blocked for this month'
              : `${blocked.length} machine${blocked.length === 1 ? '' : 's'} blocked`}
          </p>
        </div>

        {blocked.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nothing to override. Consecutive Unable to obtain only appears when last month was also Unable to obtain and this month has no reading yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous month reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {blocked.map((entry) => (
                  <tr
                    key={entry.machine.id}
                    data-override-machine-id={entry.machine.id}
                    className={clsx(
                      'hover:bg-gray-50',
                      highlightMachineId === entry.machine.id && 'bg-violet-50 ring-2 ring-inset ring-violet-300',
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.machine.machineSerialNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.machine.customer?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                      {entry.previousReading?.unableToReadReason || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.pendingRequest ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-900">
                          Requested by {entry.pendingRequest.requestedBy?.name || 'manager'}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={isLocked || overrideMutation.isPending}
                        onClick={() => setModalEntry(entry)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-violet-700 rounded-lg hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Force-approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalEntry && (
        <ForceApproveModal
          entry={modalEntry}
          isSubmitting={overrideMutation.isPending}
          onCancel={() => {
            if (!overrideMutation.isPending) setModalEntry(null);
          }}
          onConfirm={(reason) => {
            overrideMutation.mutate({ machineId: modalEntry.machine.id, reason });
          }}
        />
      )}
    </div>
  );
}
