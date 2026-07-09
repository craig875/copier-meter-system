import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { trimLeading } from '../utils/string';

export default function UnableToObtainModal({
  machine,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');

  if (!machine) return null;

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    onConfirm(trimmedReason);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="popup-panel max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-rose-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Unable to obtain reading</h2>
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
            <label htmlFor="unable-to-obtain-reason" className="block text-sm font-medium text-gray-900">
              Reason (required)
            </label>
            <p className="text-xs text-gray-600">
              No counter readings could be obtained this month. Explain why before saving.
            </p>
            <textarea
              id="unable-to-obtain-reason"
              value={reason}
              onChange={(e) => setReason(trimLeading(e.target.value))}
              placeholder="e.g. Machine off-site, panel locked"
              maxLength={500}
              rows={3}
              autoFocus
              className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
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
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Confirm and save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
