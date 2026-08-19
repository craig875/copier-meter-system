export const BILLING_LINE_TYPES = {
  billed: 'billed',
  excluded: 'excluded',
  unmatched: 'unmatched',
  noActivity: 'noActivity',
};

export function confirmKey(line) {
  return String(line?.clientCode || '').trim().toLowerCase();
}

function lineAmount(line) {
  const stored = Number(line?.lineTotal);
  if (Number.isFinite(stored) && line?.lineTotal != null && line.lineTotal !== '') {
    return stored;
  }
  return (
    Number(line?.mobile || 0) +
    Number(line?.international || 0) +
    Number(line?.national || 0) +
    Number(line?.local || 0) +
    Number(line?.special || 0) +
    Number(line?.virtual || 0) +
    Number(line?.vce || 0)
  );
}

export function totalOfLines(lines = []) {
  return lines.reduce((sum, line) => sum + lineAmount(line), 0);
}

export function isNoActivityLine(line) {
  if (!line || line.excluded || line.unmatched) return false;
  if (line.noActivity) return true;
  return lineAmount(line) === 0;
}

export function partitionBillingLines(lines = []) {
  const billed = [];
  const excluded = [];
  const unmatched = [];
  const noActivity = [];
  for (const line of lines) {
    if (line.excluded) excluded.push(line);
    else if (line.unmatched) unmatched.push(line);
    else if (isNoActivityLine(line)) noActivity.push(line);
    else billed.push(line);
  }
  return { billed, excluded, unmatched, noActivity };
}

export function toBillingSaveLine(line, extras = {}) {
  return {
    clientCode: line.clientCode || '',
    customerName: line.customerName || '',
    category: line.category || '',
    mobile: line.mobile || 0,
    international: line.international || 0,
    national: line.national || 0,
    local: line.local || 0,
    special: line.special || 0,
    virtual: line.virtual || 0,
    vce: line.vce || 0,
    ...extras,
  };
}

export function smartEdgeExportLines({ billed = [], noActivity = [] } = {}) {
  return [...billed, ...noActivity];
}

export function groupRunLines(lines = []) {
  const billed = [];
  const excluded = [];
  const unmatched = [];
  const noActivity = [];
  for (const line of lines) {
    const type = String(line.lineType || BILLING_LINE_TYPES.billed);
    if (type === BILLING_LINE_TYPES.excluded) excluded.push(line);
    else if (type === BILLING_LINE_TYPES.unmatched) unmatched.push(line);
    else if (type === BILLING_LINE_TYPES.noActivity || lineAmount(line) === 0) noActivity.push(line);
    else billed.push(line);
  }
  return { billed, excluded, unmatched, noActivity };
}
