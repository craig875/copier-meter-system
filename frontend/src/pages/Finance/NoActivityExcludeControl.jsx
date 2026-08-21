import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const FLASH_MS = 450;

/**
 * Inline exclude for a no-activity row.
 * Persists via onExclude, flashes green, then calls onExcluded so the parent can move the row.
 */
export default function NoActivityExcludeControl({ disabled, busy, onExclude, onExcluded }) {
  const [flash, setFlash] = useState(false);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending || flash || busy) return;
    setPending(true);
    try {
      const ok = await onExclude();
      if (!ok) {
        setPending(false);
        return;
      }
      setPending(false);
      setFlash(true);
      window.setTimeout(() => {
        onExcluded?.();
      }, FLASH_MS);
    } catch {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending || flash || busy}
      className={clsx(
        'ml-2 inline-flex items-center px-2 py-0.5 rounded border text-xs transition-colors',
        flash
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
      )}
      aria-label="Exclude this Smart Edge code"
    >
      {pending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
      {flash ? 'Excluded' : 'Exclude'}
    </button>
  );
}
