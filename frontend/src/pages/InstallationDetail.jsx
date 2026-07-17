import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { installationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { buildFromState } from '../utils/navigationFrom';
import {
  INSTALL_STATUSES,
  INSTALL_STATUS_BADGE,
  installStatusLabel,
} from '../constants/installations';
import { trimLeading } from '../utils/string';
import InstallTasksPanel from '../components/installations/InstallTasksPanel';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function primaryDocument(install) {
  const docs = install?.documents ?? [];
  return docs.find((d) => d.kind === 'LINK') || docs[0] || null;
}

function formatTimelineStatus(u) {
  if (u.previousStatus && u.newStatus) {
    return `Status: ${installStatusLabel(u.previousStatus)} → ${installStatusLabel(u.newStatus)}`;
  }
  if (u.newStatus && !u.previousStatus) {
    return `Status: ${installStatusLabel(u.newStatus)}`;
  }
  return null;
}

function formatTimelineProgress(u) {
  if (u.previousProgress == null && u.newProgress == null) return null;
  if (u.previousProgress && u.newProgress) {
    return `Progress: “${u.previousProgress}” → “${u.newProgress}”`;
  }
  if (u.newProgress) return `Progress: “${u.newProgress}”`;
  return null;
}

export default function InstallationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isElevated } = useAuth();

  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');
  const [note, setNote] = useState('');

  const [editingDoc, setEditingDoc] = useState(false);
  const [docUrl, setDocUrl] = useState('');
  const [docLabel, setDocLabel] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['installations', id],
    queryFn: () => installationsApi.get(id),
    enabled: !!id,
  });

  const { data: updatesData } = useQuery({
    queryKey: ['installations', id, 'updates'],
    queryFn: () => installationsApi.getUpdates(id),
    enabled: !!id,
  });

  const install = data?.install;
  const doc = primaryDocument(install);

  useEffect(() => {
    if (!install) return;
    setStatus(install.status || 'active');
    setProgress(install.progress || '');
  }, [install?.id, install?.status, install?.progress]);

  useEffect(() => {
    if (!editingDoc) return;
    setDocUrl(doc?.url || '');
    setDocLabel(doc?.label || '');
  }, [editingDoc, doc?.url, doc?.label]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['installations', id] });
    queryClient.invalidateQueries({ queryKey: ['installations', id, 'updates'] });
    queryClient.invalidateQueries({ queryKey: ['installations', 'list'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => installationsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Installation updated');
      setNote('');
      setEditingDoc(false);
      invalidate();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error || !install) {
    return (
      <div className="tile-card p-6 text-center text-red-600">
        Installation not found or you do not have access.
      </div>
    );
  }

  const updates = updatesData?.updates ?? [];
  const statusChanged = status && status !== install.status;
  const progressChanged = progress.trim() !== (install.progress || '').trim();
  const canSubmitUpdate = statusChanged || progressChanged;

  const handleProgressSubmit = (e) => {
    e.preventDefault();
    if (!canSubmitUpdate) {
      toast.error('Change status or progress to save an update');
      return;
    }
    const payload = {};
    if (statusChanged) payload.status = status;
    if (progressChanged) payload.progress = progress.trim() || null;
    if (note.trim()) payload.note = note.trim();
    updateMutation.mutate(payload);
  };

  const handleDocSave = (e) => {
    e.preventDefault();
    const url = docUrl.trim();
    if (!url) {
      toast.error('Document URL is required');
      return;
    }
    updateMutation.mutate({
      documentUrl: url,
      documentLabel: docLabel.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      {!isElevated && (
        <div className="tile-card p-3 text-sm text-amber-800 bg-amber-50 border border-amber-100">
          Read-only view — you can update status on tasks assigned to you.
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{install.customerName}</h1>
          <p className="text-gray-500">{install.siteName || install.type?.name || 'Installation'}</p>
        </div>
        <span
          className={clsx(
            'inline-flex px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
            INSTALL_STATUS_BADGE[install.status] || 'bg-gray-100 text-gray-600'
          )}
        >
          {installStatusLabel(install.status)}
        </span>
        {isElevated && (
          <Link
            to={`/installations/${id}/edit`}
            state={buildFromState(location)}
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
            <h2 className="font-semibold text-gray-900">Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900">{install.type?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Branch</dt>
                <dd className="font-medium text-gray-900">{install.branch}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Sales Order</dt>
                <dd className="font-medium text-gray-900">
                  {install.salesOrderNumber ? (
                    install.salesOrderUrl ? (
                      <a
                        href={install.salesOrderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        {install.salesOrderNumber}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      install.salesOrderNumber
                    )
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Technician</dt>
                <dd className="font-medium text-gray-900">
                  {install.assignedTechnicianName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Scheduled</dt>
                <dd className="font-medium text-gray-900">{formatDate(install.scheduledDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Completed</dt>
                <dd className="font-medium text-gray-900">{formatDate(install.completedDate)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Site</dt>
                <dd className="font-medium text-gray-900">
                  {install.siteName || '—'}
                  {install.siteAddress && (
                    <span className="block text-gray-600 font-normal mt-0.5">
                      {install.siteAddress}
                    </span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Current Progress</dt>
                <dd className="font-medium text-gray-900 whitespace-pre-wrap">
                  {install.progress || '—'}
                </dd>
              </div>
              {install.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">{install.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="tile-card p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Documents</h2>
              {isElevated && !editingDoc && (
                <button
                  type="button"
                  onClick={() => setEditingDoc(true)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {doc ? 'Edit link' : 'Add link'}
                </button>
              )}
            </div>

            {isElevated && editingDoc ? (
              <form onSubmit={handleDocSave} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(trimLeading(e.target.value))}
                    placeholder="https://..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={docLabel}
                    onChange={(e) => setDocLabel(trimLeading(e.target.value))}
                    placeholder="OneDrive folder / packing list"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDoc(false)}
                    className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : doc?.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <LinkIcon className="h-4 w-4" />
                {doc.label || 'Open document link'}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-sm text-gray-500">No document link yet.</p>
            )}
          </div>

          <InstallTasksPanel installId={id} tasks={install.tasks ?? []} />

          <div className="tile-card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
            {updates.length === 0 ? (
              <p className="text-gray-500 text-sm">No updates yet.</p>
            ) : (
              <ul className="space-y-4">
                {updates.map((u) => {
                  const statusLine = formatTimelineStatus(u);
                  const progressLine = formatTimelineProgress(u);
                  return (
                    <li key={u.id} className="border-l-2 border-gray-200 pl-4">
                      <p className="text-sm text-gray-500">
                        {formatDateTime(u.createdAt)}
                        {u.createdBy?.name ? ` · ${u.createdBy.name}` : ''}
                      </p>
                      {statusLine && (
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{statusLine}</p>
                      )}
                      {progressLine && (
                        <p className="text-sm text-gray-800 mt-0.5">{progressLine}</p>
                      )}
                      {u.note && <p className="text-sm text-gray-700 mt-1">{u.note}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {isElevated && (
          <div className="tile-card p-6 space-y-4 h-fit">
            <h2 className="font-semibold text-gray-900">Update Progress</h2>
            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {INSTALL_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
                <textarea
                  value={progress}
                  onChange={(e) => setProgress(trimLeading(e.target.value))}
                  rows={3}
                  placeholder="What is the current state?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(trimLeading(e.target.value))}
                  rows={2}
                  placeholder="Extra context for this update"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={!canSubmitUpdate || updateMutation.isPending}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Update
              </button>
              <p className="text-xs text-gray-500">
                Changing status or progress creates a timeline entry.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
