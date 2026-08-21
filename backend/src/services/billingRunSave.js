import { billedTotals, billingLineAmount, toBillingRunLineCreate } from './billingRunLines.js';

export const BILLING_RUN_STATUS = {
  draft: 'draft',
  submitted: 'submitted',
};

export function normalizeBillingRunStatus(value) {
  return value === BILLING_RUN_STATUS.submitted
    ? BILLING_RUN_STATUS.submitted
    : BILLING_RUN_STATUS.draft;
}

/**
 * Build line create rows and rollup totals from a save payload.
 */
export function buildBillingRunSnapshot(body = {}) {
  const billed = Array.isArray(body.lines) ? body.lines : [];
  const noActivity = Array.isArray(body.noActivityLines) ? body.noActivityLines : [];
  const excluded = Array.isArray(body.excludedLines) ? body.excludedLines : [];
  const unmatched = Array.isArray(body.unmatchedLines) ? body.unmatchedLines : [];

  const smartEdge = [...billed, ...noActivity];
  const totals = billedTotals(smartEdge);
  const billedTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const supplierTotal =
    billedTotal +
    excluded.reduce((s, l) => s + billingLineAmount(l), 0) +
    unmatched.reduce((s, l) => s + billingLineAmount(l), 0);

  const lineRows = [
    ...billed.map((l) => toBillingRunLineCreate(l, 'billed')),
    ...noActivity.map((l) => toBillingRunLineCreate(l, 'noActivity')),
    ...excluded.map((l) => toBillingRunLineCreate(l, 'excluded')),
    ...unmatched.map((l) => toBillingRunLineCreate(l, 'unmatched')),
  ];

  return {
    lineRows,
    totals,
    clientCount: smartEdge.length,
    grandTotal: supplierTotal,
    isEmpty: lineRows.length === 0,
  };
}

export function normalizeBillingRunFiles(files = []) {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => ({
      filename: String(file?.filename || file?.name || '').trim(),
      engine: String(file?.engine || '').trim() || 'unknown',
      content: String(file?.content ?? ''),
      encoding: file?.encoding === 'base64' ? 'base64' : 'text',
      contentType: file?.contentType || file?.type || null,
    }))
    .filter((file) => file.filename && file.content !== undefined);
}
