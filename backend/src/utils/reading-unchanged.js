/**
 * Resolve stored unchanged-counter reason: only kept when current equals previous.
 */
export function resolveUnchangedReason(currentValue, previousValue, reason) {
  if (currentValue == null || previousValue == null) return null;
  if (currentValue !== previousValue) return null;
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}
