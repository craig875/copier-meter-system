import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, permissionsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiError';
import PermissionCheckboxGroups from '../components/PermissionCheckboxGroups';
import toast from 'react-hot-toast';
import { Pencil, X, Check, Shield, Lock } from 'lucide-react';
import clsx from 'clsx';
import { MODULE_OPTIONS } from '../constants/modules';

const PREVIEW_MODULES = MODULE_OPTIONS.map((o) => o.key);
const PREVIEW_DEBOUNCE_MS = 350;

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

const Roles = () => {
  const { can } = useAuth();
  const canManage = can('users.manage_roles');
  const [editingRole, setEditingRole] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: catalogData } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () => permissionsApi.getCatalog(),
    staleTime: Infinity,
  });

  const roles = data?.roles || [];
  const catalogGroups = catalogData?.groups || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div data-tour="roles-content" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-500">
          Edit role permission matrices. Owner is frozen and cannot be changed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const immutable = role.isImmutable || role.key === 'owner';
          return (
            <div
              key={role.id}
              className={clsx(
                'bg-white rounded-lg shadow-sm p-4 border-2',
                immutable ? 'border-amber-200' : 'border-transparent'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      immutable ? 'bg-amber-100' : 'bg-indigo-100'
                    )}
                  >
                    {immutable ? (
                      <Lock className="h-5 w-5 text-amber-700" />
                    ) : (
                      <Shield className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{role.key}</p>
                  </div>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setEditingRole(role)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title={immutable ? 'View (frozen)' : 'Edit permissions'}
                  >
                    {immutable ? <Lock className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </button>
                ) : null}
              </div>

              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {immutable ? (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Immutable
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Editable
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {role.userCount} user{role.userCount === 1 ? '' : 's'} ·{' '}
                    {role.permissionKeys?.length ?? 0} permissions
                  </span>
                </div>
                {role.description ? (
                  <p className="text-xs text-gray-500 line-clamp-2">{role.description}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {editingRole && (
        <RoleMatrixModal
          role={editingRole}
          catalogGroups={catalogGroups}
          readOnly={editingRole.isImmutable || editingRole.key === 'owner'}
          onClose={() => setEditingRole(null)}
        />
      )}
    </div>
  );
};

function RoleMatrixModal({ role, catalogGroups, readOnly, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const callerPermissions = useMemo(
    () => new Set(Array.isArray(user?.permissions) ? user.permissions : []),
    [user?.permissions]
  );

  const baselineName = role.name || '';
  const baselineDescription = role.description ?? '';
  const baselineKeys = useMemo(
    () => new Set(role.permissionKeys || []),
    [role.permissionKeys]
  );

  const [name, setName] = useState(baselineName);
  const [description, setDescription] = useState(baselineDescription);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(baselineKeys));
  const [rejectedKeys, setRejectedKeys] = useState(() => new Set());
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewReqId = useRef(0);

  const metaDirty =
    name.trim() !== baselineName.trim() ||
    (description ?? '') !== (baselineDescription ?? '');
  const matrixDirty = !setsEqual(selectedKeys, baselineKeys);
  const canSave = !readOnly && (metaDirty || matrixDirty);

  const disabledKeys = useMemo(() => {
    if (readOnly) return new Set(selectedKeys);
    // Keys the caller cannot grant: disable toggling (still show current state)
    const disabled = new Set();
    for (const group of catalogGroups) {
      for (const item of group.keys) {
        if (!callerPermissions.has(item.key)) {
          disabled.add(item.key);
        }
      }
    }
    return disabled;
  }, [readOnly, selectedKeys, catalogGroups, callerPermissions]);

  const toggleKey = (key) => {
    if (readOnly || disabledKeys.has(key)) return;
    setRejectedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Debounced preview with AbortController + stale-response guard
  useEffect(() => {
    if (readOnly && role.key === 'owner') {
      setPreview({
        permissions: [...(role.permissionKeys || [])],
        meta: { mode: 'hypothetical', roleKey: 'owner', moduleFiltered: false, warnings: [] },
      });
      return undefined;
    }

    const controller = new AbortController();
    const reqId = ++previewReqId.current;
    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const keys = [...selectedKeys].sort();
        const result = await permissionsApi.preview(
          {
            roleKey: role.key,
            permissionKeys: keys,
            modules: PREVIEW_MODULES,
          },
          { signal: controller.signal }
        );
        if (controller.signal.aborted || reqId !== previewReqId.current) return;
        setPreview(result);
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        if (reqId !== previewReqId.current) return;
        // Preview failures should not block editing
        console.warn('Permission preview failed', err);
      } finally {
        if (reqId === previewReqId.current) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedKeys, role.key, role.permissionKeys, readOnly]);

  const mutation = useMutation({
    mutationFn: (body) => rolesApi.update(role.id, body),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries(['roles']);
      onClose();
    },
    onError: (error) => {
      const parsed = parseApiError(error, 'Failed to update role');
      if (parsed.rejectedKeys.length > 0) {
        setRejectedKeys(new Set(parsed.rejectedKeys));
        toast.error(
          `Cannot assign ${parsed.rejectedKeys.length} permission(s) outside your set`
        );
        return;
      }
      toast.error(parsed.message);
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!canSave || readOnly) return;

    const body = {};
    if (metaDirty) {
      body.name = name.trim();
      body.description = description.trim() === '' ? null : description.trim();
    }
    // Escalation brake: never send permissionKeys unless matrix was touched
    if (matrixDirty) {
      body.permissionKeys = [...selectedKeys].sort();
    }
    if (Object.keys(body).length === 0) return;
    mutation.mutate(body);
  };

  const effectiveCount = preview?.permissions?.length;
  const warnings = preview?.meta?.warnings ?? [];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {readOnly ? 'View role (frozen)' : 'Edit role permissions'}
            </h2>
            <p className="text-sm text-gray-500 font-mono">{role.key}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {readOnly ? (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Owner role is frozen. Overrides do not apply and the permission matrix cannot be
            modified.
          </div>
        ) : null}

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800">Live preview</span>
                <span className="text-gray-600">
                  {previewLoading
                    ? 'Updating…'
                    : effectiveCount != null
                      ? `Effective: ${effectiveCount} permissions`
                      : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Preview assumes all product modules ({PREVIEW_MODULES.join(', ')}).
              </p>
              {warnings.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {warnings.map((w) => (
                    <li key={`${w.code}-${w.permissionKey}`} className="text-xs text-amber-800">
                      {w.message || w.code}
                      {w.permissionKey ? ` (${w.permissionKey})` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {rejectedKeys.size > 0 ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {rejectedKeys.size} permission(s) were rejected — they sit outside your own
                effective set. Adjust the highlighted checkboxes and try again.
              </div>
            ) : null}

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Permissions ({selectedKeys.size} selected)
              </span>
              {catalogGroups.length === 0 ? (
                <p className="text-sm text-gray-500">Loading catalog…</p>
              ) : (
                <PermissionCheckboxGroups
                  groups={catalogGroups}
                  selectedKeys={selectedKeys}
                  onToggle={toggleKey}
                  disabledKeys={disabledKeys}
                  rejectedKeys={rejectedKeys}
                  readOnly={readOnly}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly ? (
              <button
                type="submit"
                disabled={!canSave || mutation.isPending}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4 mr-2" />
                {mutation.isPending ? 'Saving...' : 'Save'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Roles;
