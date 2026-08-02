import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

const OVERRIDE_EFFECTS = [
  { value: null, label: 'None' },
  { value: 'GRANT', label: 'Grant' },
  { value: 'DENY', label: 'Deny' },
];

function effectForKey(effects, key) {
  if (!effects) return null;
  if (effects instanceof Map) return effects.get(key) ?? null;
  return effects[key] ?? null;
}

/**
 * Presentational permission groups from GET /permissions/catalog.
 * mode="binary" (default): role matrix checkboxes — Part 1 / Roles.
 * mode="override": three-state None / Grant / Deny — Part 2.
 *
 * @param {{
 *   mode?: 'binary' | 'override',
 *   groups: Array<{ id: string, label: string, keys: Array<{ key: string, label: string }> }>,
 *   selectedKeys?: Set<string>,
 *   onToggle?: (key: string) => void,
 *   effects?: Map<string, 'GRANT'|'DENY'> | Record<string, 'GRANT'|'DENY'>,
 *   onEffectChange?: (key: string, effect: 'GRANT'|'DENY'|null) => void,
 *   disabledKeys?: Set<string>,
 *   rejectedKeys?: Set<string>,
 *   readOnly?: boolean,
 * }} props
 */
export default function PermissionCheckboxGroups({
  mode = 'binary',
  groups = [],
  selectedKeys,
  onToggle,
  effects,
  onEffectChange,
  disabledKeys = new Set(),
  rejectedKeys = new Set(),
  readOnly = false,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const isOverride = mode === 'override';

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
        const badgeCount = isOverride
          ? group.keys.filter((k) => effectForKey(effects, k.key) != null).length
          : group.keys.filter((k) => selectedKeys?.has(k.key)).length;
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
                {badgeCount}/{group.keys.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="p-2 space-y-1">
                {group.keys.map((item) => {
                  const disabled = readOnly || disabledKeys.has(item.key);
                  const rejected = rejectedKeys.has(item.key);

                  if (isOverride) {
                    const current = effectForKey(effects, item.key);
                    return (
                      <div
                        key={item.key}
                        className={clsx(
                          'flex flex-col sm:flex-row sm:items-start gap-2 p-2 rounded-lg border',
                          rejected
                            ? 'border-red-400 bg-red-50'
                            : 'border-transparent hover:bg-gray-50',
                          disabled && !rejected && 'opacity-60'
                        )}
                      >
                        <div className="flex-1 min-w-0">
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
                        </div>
                        <div
                          className="inline-flex shrink-0 rounded-lg border border-gray-200 overflow-hidden"
                          role="group"
                          aria-label={`Override for ${item.key}`}
                        >
                          {OVERRIDE_EFFECTS.map(({ value, label }) => {
                            const active =
                              value === null ? current == null : current === value;
                            return (
                              <button
                                key={label}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (disabled || !onEffectChange) return;
                                  onEffectChange(item.key, value);
                                }}
                                className={clsx(
                                  'px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed',
                                  active && value === null && 'bg-gray-200 text-gray-900',
                                  active && value === 'GRANT' && 'bg-green-100 text-green-800',
                                  active && value === 'DENY' && 'bg-red-100 text-red-800',
                                  !active && 'bg-white text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const checked = selectedKeys?.has(item.key) ?? false;
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
                        onChange={() => onToggle?.(item.key)}
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
