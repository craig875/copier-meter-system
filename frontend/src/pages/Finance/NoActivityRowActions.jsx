import NoActivityConfirmControl from './NoActivityConfirmControl';
import NoActivityExcludeControl from './NoActivityExcludeControl';

/**
 * Confirm / Exclude for zero-activity, or Save/Cancel while amounts are being edited.
 */
export default function NoActivityRowActions({
  editing,
  confirmed,
  onToggleConfirm,
  onSave,
  onCancel,
  canExclude,
  excludeBusy,
  onExclude,
  onExcluded,
}) {
  if (editing) {
    return (
      <span className="ml-2 inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center px-2 py-0.5 rounded border border-emerald-600 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-2 py-0.5 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center">
      <NoActivityConfirmControl confirmed={confirmed} onToggle={onToggleConfirm} />
      {canExclude ? (
        <NoActivityExcludeControl
          busy={excludeBusy}
          onExclude={onExclude}
          onExcluded={onExcluded}
        />
      ) : null}
    </span>
  );
}
