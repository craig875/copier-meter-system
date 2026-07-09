import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Confirm zero-usage readings: one reason field per unchanged counter.
 */
export default function ReadingUnchangedConfirmModal({
  items,
  defaultReasons,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) {
  const [reasons, setReasons] = useState({});

  useEffect(() => {
    const defaults = defaultReasons ?? {};
    const initial = {};
    for (const item of items) {
      initial[item.key] = defaults[item.key] ?? '';
    }
    setReasons(initial);
  }, [items, defaultReasons]);

  if (!items?.length) return null;

  const allFilled = items.every((item) => reasons[item.key]?.trim().length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allFilled) return;
    onConfirm(reasons);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="popup-panel max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Confirm zero usage</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              One or more counters match last month. Add a short reason for each.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {items.map((item) => (
            <div key={item.key} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-sm font-medium text-gray-900">
                {item.machineSerialNumber} — {item.label}
              </p>
              <p className="text-xs text-gray-600">
                Reading unchanged at {item.current.toLocaleString()} (same as previous month).
              </p>
              <input
                type="text"
                value={reasons[item.key] || ''}
                onChange={(e) => setReasons((prev) => ({ ...prev, [item.key]: e.target.value }))}
                placeholder='e.g. "No scans this period"'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
            </div>
          ))}

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
              disabled={!allFilled || isSubmitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Confirm and save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
