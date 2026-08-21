import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  CALL_TYPE_AMOUNT_FIELDS,
  emptyCallTypeDraft,
} from './billingLineSets';
import NoActivityAmountCell from './NoActivityAmountCell';
import NoActivityRowActions from './NoActivityRowActions';

/**
 * Full table row for a no-activity contract line.
 * Edit/focus/draft session state stays here so BillingImport does not re-render on keystrokes.
 */
export default function NoActivityBillingRow({
  line,
  confirmed,
  onToggleConfirm,
  onSave,
  canExclude,
  excludeBusy,
  onExclude,
  onExcluded,
}) {
  const [editing, setEditing] = useState(false);
  const [focusKey, setFocusKey] = useState(CALL_TYPE_AMOUNT_FIELDS[0].key);
  const valuesRef = useRef(emptyCallTypeDraft(line));

  const startEdit = useCallback((fieldKey) => {
    valuesRef.current = emptyCallTypeDraft(line);
    setFocusKey(fieldKey || CALL_TYPE_AMOUNT_FIELDS[0].key);
    setEditing(true);
  }, [line]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    valuesRef.current = emptyCallTypeDraft(line);
  }, [line]);

  const moveFocus = useCallback((delta) => {
    setFocusKey((prev) => {
      const keys = CALL_TYPE_AMOUNT_FIELDS.map((col) => col.key);
      const current = keys.indexOf(prev);
      const nextIndex = Math.min(keys.length - 1, Math.max(0, current + delta));
      return keys[nextIndex];
    });
  }, []);

  const saveEdit = useCallback(() => {
    const draft = { ...valuesRef.current };
    onSave(draft);
    setEditing(false);
  }, [onSave]);

  return (
    <tr
      className={clsx(
        confirmed ? 'bg-emerald-50' : 'bg-sky-50',
        editing && 'ring-1 ring-inset ring-sky-300'
      )}
    >
      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
        {line.clientCode || '—'}
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        {line.customerName}
        <span className="ml-2 text-xs text-sky-700">No activity</span>
        <NoActivityRowActions
          editing={editing}
          confirmed={confirmed}
          onToggleConfirm={onToggleConfirm}
          onSave={saveEdit}
          onCancel={cancelEdit}
          canExclude={canExclude}
          excludeBusy={excludeBusy}
          onExclude={onExclude}
          onExcluded={onExcluded}
        />
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">{line.category || '—'}</td>
      {CALL_TYPE_AMOUNT_FIELDS.map(({ key, label }) => (
        <td key={key} className="px-4 py-3 text-sm whitespace-nowrap">
          <NoActivityAmountCell
            fieldKey={key}
            label={label}
            displayValue={line[key]}
            editing={editing}
            autoFocus={editing && focusKey === key}
            valuesRef={valuesRef}
            onStartEdit={() => startEdit(key)}
            onTabNext={() => moveFocus(1)}
            onTabPrev={() => moveFocus(-1)}
            onEnterSave={saveEdit}
            onEscape={cancelEdit}
          />
        </td>
      ))}
    </tr>
  );
}
