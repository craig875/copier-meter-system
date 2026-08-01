/**
 * Build query params for fibre order list/stats APIs.
 * Users without fibre_orders.view_all are agent-scoped server-side by salesAgentId —
 * do not send branch filters for them.
 */
export function fibreOrderQueryParams({ effectiveBranch, canViewAll }, extra = {}) {
  const params = { ...extra };
  if (effectiveBranch && canViewAll) {
    params.branch = effectiveBranch;
  }
  return params;
}
