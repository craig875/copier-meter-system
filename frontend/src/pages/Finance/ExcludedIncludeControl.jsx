import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const FLASH_MS = 450;

/**
 * Include a charged excluded row back into billed for this run.
 * onInclude persists (code exclusion removal when applicable); onIncluded moves the row after flash.
 */
export default function ExcludedIncludeControl({ disabled, busy, onInclude, onIncluded }) {
  const [flash, setFlash] = useState(false);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending || flash || busy) return;
    setPending(true);
    try {
      const ok = await onInclude();
      if (!ok) {
        setPending(false);
        return;
      }
      setPending(false);
      setFlash(true);
      window.setTimeout(() => {
        onIncluded?.();
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
          : 'border-amber-400 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50'
      )}
      aria-label="Include this contract in billed totals"
    >
      {pending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
      {flash ? 'Included' : 'Include'}
    </button>
  );
}
