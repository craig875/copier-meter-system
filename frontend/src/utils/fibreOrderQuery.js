/**
 * Build query params for fibre order list/stats APIs.
 * Sales agents are scoped server-side by salesAgentId — do not send branch filters.
 */
export function fibreOrderQueryParams({ effectiveBranch, isSalesAgent }, extra = {}) {
  const params = { ...extra };
  if (effectiveBranch && !isSalesAgent) {
    params.branch = effectiveBranch;
  }
  return params;
}
