import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function UnmatchedCodeEditor({
  initialCode,
  disabled,
  busy,
  onUpdate,
}) {
  const [code, setCode] = useState(String(initialCode || ''));

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onUpdate(code);
          }
        }}
        disabled={disabled || busy}
        className="w-28 px-2 py-0.5 border border-orange-300 rounded text-xs text-gray-900 bg-white"
        aria-label="Smart Edge code"
      />
      <button
        type="button"
        onClick={() => onUpdate(code)}
        disabled={disabled || busy}
        className="inline-flex items-center px-2 py-0.5 rounded bg-orange-700 text-white text-xs hover:bg-orange-800 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
        Update & Reprocess
      </button>
    </span>
  );
}
