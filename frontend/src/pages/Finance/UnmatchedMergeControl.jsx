import { useState } from 'react';

export default function UnmatchedMergeControl({ codeListId, onMerge }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');

  const close = () => {
    setOpen(false);
    setCode('');
  };

  const confirm = () => {
    if (onMerge(code)) close();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center px-2 py-0.5 rounded border border-orange-300 text-xs text-orange-800 hover:bg-orange-100"
      >
        Merge into
      </button>
    );
  }

  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      <input
        type="text"
        list={codeListId}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            confirm();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        placeholder="Target code"
        autoFocus
        className="w-28 px-2 py-0.5 border border-orange-300 rounded text-xs text-gray-900"
        aria-label="Target Smart Edge code"
      />
      <button
        type="button"
        onClick={confirm}
        className="px-2 py-0.5 rounded bg-orange-700 text-white text-xs hover:bg-orange-800"
      >
        Merge
      </button>
      <button type="button" onClick={close} className="px-2 py-0.5 rounded text-xs text-gray-600 hover:bg-orange-100">
        Cancel
      </button>
    </span>
  );
}
