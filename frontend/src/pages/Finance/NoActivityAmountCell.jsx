import { useEffect, useRef, useState } from 'react';
import { formatZar } from './formatZar';

/**
 * Call-type cell for no-activity rows.
 * Draft text lives in local state so keystrokes do not re-render the table.
 * Latest value is mirrored into valuesRef for Save/Enter collection.
 */
export default function NoActivityAmountCell({
  fieldKey,
  label,
  displayValue,
  editing,
  autoFocus,
  valuesRef,
  onStartEdit,
  onTabNext,
  onTabPrev,
  onEnterSave,
  onEscape,
}) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(() => String(Number(displayValue || 0)));

  useEffect(() => {
    if (!editing) return;
    const initial = String(Number(displayValue || 0));
    setValue(initial);
    if (valuesRef?.current) valuesRef.current[fieldKey] = initial;
  }, [editing, displayValue, fieldKey, valuesRef]);

  useEffect(() => {
    if (!editing || !autoFocus) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing, autoFocus]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        className="w-full min-w-[4.5rem] text-left px-1 py-0.5 rounded tabular-nums hover:bg-sky-100 hover:ring-1 hover:ring-sky-300"
        title={`Edit ${label} amounts for this row`}
        aria-label={`Edit ${label} amount`}
      >
        {formatZar(displayValue)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        if (valuesRef?.current) valuesRef.current[fieldKey] = next;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          if (e.shiftKey) onTabPrev();
          else onTabNext();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnterSave();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onEscape();
        }
      }}
      className="w-24 px-2 py-0.5 border border-sky-400 rounded text-sm text-gray-900 bg-white"
      aria-label={`${label} amount`}
    />
  );
}
