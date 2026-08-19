export default function NoActivityConfirmControl({ confirmed, onToggle }) {
  if (confirmed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="ml-2 inline-flex items-center px-2 py-0.5 rounded border border-emerald-300 bg-emerald-100 text-xs text-emerald-800"
        aria-pressed="true"
      >
        ✓ Checked
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="ml-2 inline-flex items-center px-2 py-0.5 rounded border border-sky-300 text-xs text-sky-800 hover:bg-sky-100"
      aria-pressed="false"
    >
      Confirm
    </button>
  );
}
