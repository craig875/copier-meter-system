/**
 * Own-vs-all resource gate.
 *
 * There is no CrmTask-specific helper in the codebase yet. Install tasks use
 * an inline view/manage + assignee check. This is the shared pattern for CRM
 * deals (`ownerId`) and CRM tasks (`assignedToId`): manage_all wins; otherwise
 * manage_own requires the caller to be the owner/assignee.
 *
 * @param {{ id?: string, permissions?: string[] } | null | undefined} user
 * @param {string | null | undefined} ownerUserId
 * @param {{ manageAllKey: string, manageOwnKey: string }} keys
 * @returns {boolean}
 */
export function canManageOwnedResource(user, ownerUserId, { manageAllKey, manageOwnKey }) {
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  if (perms.includes(manageAllKey)) return true;
  if (!perms.includes(manageOwnKey)) return false;
  return ownerUserId != null && ownerUserId === user?.id;
}

export const CRM_DEAL_MANAGE_KEYS = Object.freeze({
  manageAllKey: 'crm.deals.manage_all',
  manageOwnKey: 'crm.deals.manage_own',
});

export const CRM_TASK_MANAGE_KEYS = Object.freeze({
  manageAllKey: 'crm.tasks.manage_all',
  manageOwnKey: 'crm.tasks.manage_own',
});

export function canManageCrmDeal(user, ownerUserId) {
  return canManageOwnedResource(user, ownerUserId, CRM_DEAL_MANAGE_KEYS);
}

export function canManageCrmTask(user, assignedToId) {
  return canManageOwnedResource(user, assignedToId, CRM_TASK_MANAGE_KEYS);
}
