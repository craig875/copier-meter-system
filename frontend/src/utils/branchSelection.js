const VALID_BRANCHES = new Set(['JHB', 'CT']);

export function getAllowedBranches(user) {
  if (!Array.isArray(user?.allowedBranches)) return [];
  return [...new Set(user.allowedBranches.filter((branch) => VALID_BRANCHES.has(branch)))];
}

export function resolveActiveBranch(user, storedBranch = null) {
  const allowed = getAllowedBranches(user);
  if (allowed.length === 1) {
    return allowed.includes(user?.defaultBranch) ? user.defaultBranch : allowed[0];
  }
  return allowed.includes(storedBranch) ? storedBranch : null;
}

export function requiresBranchSelection(user, activeBranch) {
  return getAllowedBranches(user).length > 1 && !activeBranch;
}

export function branchLabel(branch) {
  if (branch === 'JHB') return 'Johannesburg';
  if (branch === 'CT') return 'Cape Town';
  return branch;
}
