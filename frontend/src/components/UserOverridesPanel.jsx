import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, permissionsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiError';
import PermissionCheckboxGroups from './PermissionCheckboxGroups';
import toast from 'react-hot-toast';

/**
 * Per-user permission overrides panel (Stage F Part 2).
 * Immediate per-key PUT/DELETE; Mode A live preview ({ userId }).
 */
export default function UserOverridesPanel({ userId, isOwnerProtected = false }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const frozen = !!isOwnerProtected;

  const [rejectedKeys, setRejectedKeys] = useState(() => new Set());
  const [lastUpsertWarnings, setLastUpsertWarnings] = useState([]);
  const [pendingKey, setPendingKey] = useState(null);

  const callerPermissions = useMemo(
    () => new Set(Array.isArray(user?.permissions) ? user.permissions : []),
    [user?.permissions]
  );

  const { data: catalogData } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () => permissionsApi.getCatalog(),
    staleTime: Infinity,
  });

  const {
    data: overridesData,
    isLoading: overridesLoading,
  } = useQuery({
    queryKey: ['user-permission-overrides', userId],
    queryFn: () => usersApi.listPermissionOverrides(userId),
    enabled: !!userId,
  });

  const {
    data: preview,
    isFetching: previewFetching,
    isLoading: previewLoading,
  } = useQuery({
    queryKey: ['permission-preview-user', userId],
    queryFn: () => permissionsApi.preview({ userId }),
    enabled: !!userId,
  });

  const catalogGroups = catalogData?.groups || [];
  const overrides = overridesData?.overrides || [];

  const effects = useMemo(() => {
    const map = {};
    for (const row of overrides) {
      if (row?.permissionKey && (row.effect === 'GRANT' || row.effect === 'DENY')) {
        map[row.permissionKey] = row.effect;
      }
    }
    return map;
  }, [overrides]);

  const disabledKeys = useMemo(() => {
    if (frozen) {
      return new Set(catalogGroups.flatMap((g) => g.keys.map((k) => k.key)));
    }
    const disabled = new Set();
    for (const group of catalogGroups) {
      for (const item of group.keys) {
        if (!callerPermissions.has(item.key)) {
          disabled.add(item.key);
        }
      }
    }
    return disabled;
  }, [frozen, catalogGroups, callerPermissions]);

  const invalidateOverrideQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', userId] });
    queryClient.invalidateQueries({ queryKey: ['permission-preview-user', userId] });
  };

  const upsertMutation = useMutation({
    mutationFn: ({ permissionKey, effect }) =>
      usersApi.upsertPermissionOverride(userId, { permissionKey, effect }),
    onSuccess: (result, { permissionKey }) => {
      toast.success('Override saved');
      setRejectedKeys((prev) => {
        if (!prev.has(permissionKey)) return prev;
        const next = new Set(prev);
        next.delete(permissionKey);
        return next;
      });
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      setLastUpsertWarnings(warnings);
      invalidateOverrideQueries();
    },
    onError: (error, { permissionKey }) => {
      const parsed = parseApiError(error, 'Failed to save override');
      if (parsed.rejectedKeys.length > 0) {
        setRejectedKeys((prev) => new Set([...prev, ...parsed.rejectedKeys, permissionKey]));
        toast.error(
          `Cannot apply override for permission(s) outside your set`
        );
        return;
      }
      toast.error(parsed.message);
    },
    onSettled: () => setPendingKey(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (permissionKey) =>
      usersApi.deletePermissionOverride(userId, permissionKey),
    onSuccess: (_result, permissionKey) => {
      toast.success('Override removed');
      setLastUpsertWarnings([]);
      setRejectedKeys((prev) => {
        if (!prev.has(permissionKey)) return prev;
        const next = new Set(prev);
        next.delete(permissionKey);
        return next;
      });
      invalidateOverrideQueries();
    },
    onError: (error) => {
      const parsed = parseApiError(error, 'Failed to remove override');
      toast.error(parsed.message);
    },
    onSettled: () => setPendingKey(null),
  });

  const handleEffectChange = (key, effect) => {
    if (frozen || pendingKey) return;
    if (disabledKeys.has(key) && !frozen) return;

    const current = effects[key] ?? null;
    if (current === effect) return;

    setPendingKey(key);
    if (effect == null) {
      if (current == null) {
        setPendingKey(null);
        return;
      }
      deleteMutation.mutate(key);
      return;
    }
    upsertMutation.mutate({ permissionKey: key, effect });
  };

  const effectiveCount = preview?.permissions?.length;
  const previewWarnings = preview?.meta?.warnings ?? [];
  const loading = overridesLoading || previewLoading;

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
      {frozen ? (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          This account is Owner-protected. Permission overrides cannot be applied and the
          controls below are frozen. Live preview still shows effective permissions.
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-800">Live preview</span>
          <span className="text-gray-600">
            {previewFetching || previewLoading
              ? 'Updating…'
              : effectiveCount != null
                ? `Effective: ${effectiveCount} permissions`
                : '—'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Real effective permissions for this user (role + persisted overrides + modules).
        </p>
        {previewWarnings.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {previewWarnings.map((w) => (
              <li key={`${w.code}-${w.permissionKey}`} className="text-xs text-amber-800">
                {w.message || w.code}
                {w.permissionKey ? ` (${w.permissionKey})` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {lastUpsertWarnings.length > 0 ? (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <p className="font-medium mb-1">Override saved with warnings</p>
          <ul className="space-y-1">
            {lastUpsertWarnings.map((w) => (
              <li key={`${w.code}-${w.permissionKey}`} className="text-xs">
                {w.message || w.code}
                {w.permissionKey ? ` (${w.permissionKey})` : ''}
                {w.requiredModule ? ` — needs module “${w.requiredModule}”` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rejectedKeys.size > 0 ? (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {rejectedKeys.size} permission(s) were rejected — they sit outside your own
          effective set. Adjust the highlighted rows and try again.
        </div>
      ) : null}

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Permission overrides ({Object.keys(effects).length} set)
        </span>
        {loading && catalogGroups.length === 0 ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : catalogGroups.length === 0 ? (
          <p className="text-sm text-gray-500">Loading catalog…</p>
        ) : (
          <PermissionCheckboxGroups
            mode="override"
            groups={catalogGroups}
            effects={effects}
            onEffectChange={handleEffectChange}
            disabledKeys={
              pendingKey
                ? new Set([...disabledKeys, pendingKey])
                : disabledKeys
            }
            rejectedKeys={rejectedKeys}
            readOnly={frozen}
          />
        )}
      </div>
    </div>
  );
}
