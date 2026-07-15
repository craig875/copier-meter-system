import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X } from 'lucide-react';
import { connectivityApi } from '../../services/api';
import { trimLeading } from '../../utils/string';

/**
 * Inline outage note viewer/editor. Editable only while the outage is open.
 */
export default function OutageNoteEditor({
  outageId,
  note,
  editable,
  branch,
  compact = false,
  onSaved,
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note || '');

  useEffect(() => {
    if (!editing) setDraft(note || '');
  }, [note, editing]);

  const mutation = useMutation({
    mutationFn: (value) => connectivityApi.updateOutageNote(outageId, value, branch),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['connectivity'] });
      setEditing(false);
      onSaved?.(res?.outage?.note ?? null);
    },
  });

  const stop = (e) => {
    e.stopPropagation();
  };

  if (!outageId && !note) {
    return <span className="text-gray-400">-</span>;
  }

  if (!editable || !outageId) {
    return (
      <span className={compact ? 'text-xs text-gray-600 whitespace-pre-wrap break-words' : 'text-sm text-gray-700 whitespace-pre-wrap break-words'}>
        {note || '-'}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[140px] max-w-xs" onClick={stop} onKeyDown={stop}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(trimLeading(e.target.value))}
          rows={compact ? 2 : 3}
          maxLength={2000}
          autoFocus
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="Why is this link down?"
        />
        <div className="flex gap-1">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(draft)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            Save
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => {
              setDraft(note || '');
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
        {mutation.error && (
          <p className="text-xs text-red-600">
            {mutation.error?.response?.data?.error || mutation.error?.message || 'Save failed'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 min-w-0" onClick={stop}>
      <span className={compact ? 'text-xs text-gray-600 whitespace-pre-wrap break-words flex-1' : 'text-sm text-gray-700 whitespace-pre-wrap break-words flex-1'}>
        {note || <span className="text-gray-400 italic">No note</span>}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 rounded"
        title="Edit outage note"
        aria-label="Edit outage note"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
