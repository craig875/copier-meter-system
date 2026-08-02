import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Presentational permission checkbox groups from GET /permissions/catalog.
 * Reusable for role matrix (part 1) and overrides (part 2).
 *
 * @param {{
 *   groups: Array<{ id: string, label: string, keys: Array<{ key: string, label: string }> }>,
 *   selectedKeys: Set<string>,
 *   onToggle: (key: string) => void,
 *   disabledKeys?: Set<string>,
 *   rejectedKeys?: Set<string>,
 *   readOnly?: boolean,
 * }} props
 */
export default function PermissionCheckboxGroups({
  groups = [],
  selectedKeys,
  onToggle,
  disabledKeys = new Set(),
  rejectedKeys = new Set(),
  readOnly = false,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const toggleGroup = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const selectedInGroup = group.keys.filter((k) => selectedKeys.has(k.key)).length;
        return (
          <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
                {group.label}
              </span>
              <span className="text-xs text-gray-500">
                {selectedInGroup}/{group.keys.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="p-2 space-y-1">
                {group.keys.map((item) => {
                  const checked = selectedKeys.has(item.key);
                  const disabled = readOnly || disabledKeys.has(item.key);
                  const rejected = rejectedKeys.has(item.key);
                  return (
                    <label
                      key={item.key}
                      className={clsx(
                        'flex items-start gap-3 p-2 rounded-lg border cursor-pointer',
                        rejected
                          ? 'border-red-400 bg-red-50'
                          : 'border-transparent hover:bg-gray-50',
                        disabled && !rejected && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggle(item.key)}
                        className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-60"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                        <span className="block text-xs text-gray-500 font-mono">
                          {item.key}
                        </span>
                        {rejected ? (
                          <span className="block text-xs text-red-600 mt-0.5">
                            Outside your effective permission set
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
