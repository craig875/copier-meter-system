import { MODULE_COPERS, MODULE_CONNECTIVITY } from '../constants/modules';

/**
 * Users who must pick JHB/CT before using multi-branch features (aligned with login redirect).
 * Admins always; others need copiers and/or connectivity module.
 * @param {{ role?: string, modules?: string[] } | null} user
 * @returns {boolean}
 */
export function shouldPromptForBranch(user) {
  if (!user) return false;
  const roleOk =
    user.role === 'admin' ||
    user.role === 'manager' ||
    ((user.role === 'meter_user' || user.role === 'capturer') && !user.branch);
  if (!roleOk) return false;
  if (user.role === 'admin') return true;
  const mods = user.modules ?? [];
  return (
    Array.isArray(mods) &&
    (mods.includes(MODULE_COPERS) || mods.includes(MODULE_CONNECTIVITY))
  );
}
