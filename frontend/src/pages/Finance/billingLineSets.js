import { parseAmount, roundMoney } from './parseCsv.js';

export const BILLING_LINE_TYPES = {
  billed: 'billed',
  excluded: 'excluded',
  unmatched: 'unmatched',
  noActivity: 'noActivity',
};

export const CALL_TYPE_AMOUNT_FIELDS = [
  { key: 'mobile', label: 'Mobile' },
  { key: 'international', label: 'International' },
  { key: 'national', label: 'National' },
  { key: 'local', label: 'Local' },
  { key: 'special', label: 'Special' },
  { key: 'virtual', label: 'Virtual' },
  { key: 'vce', label: 'VCE' },
];

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

export function billingLineAmount(line) {
  return lineAmount(line);
}

export function lineHasCharges(line) {
  return lineAmount(line) > 0;
}

export function totalOfLines(lines = []) {
  return lines.reduce((sum, line) => sum + lineAmount(line), 0);
}

export function isNoActivityLine(line) {
  if (!line || line.excluded || line.unmatched) return false;
  return lineAmount(line) === 0;
}

export function emptyCallTypeDraft(line = {}) {
  const draft = {};
  for (const { key } of CALL_TYPE_AMOUNT_FIELDS) {
    draft[key] = String(Number(line[key] || 0));
  }
  return draft;
}

export function parseCallTypeDraft(draft = {}) {
  const amounts = {};
  for (const { key } of CALL_TYPE_AMOUNT_FIELDS) {
    amounts[key] = roundMoney(parseAmount(draft[key]));
  }
  return amounts;
}

/**
 * Apply all call-type amounts on a no-activity row at once (after Save).
 * Non-zero total clears noActivity so partition moves the row to billed.
 */
export function applyNoActivityAmounts(lines, index, draft) {
  const source = lines[index];
  if (!source || !isNoActivityLine(source)) {
    return { ok: false, error: 'That row is not a no-activity line' };
  }
  const amounts = parseCallTypeDraft(draft);
  const next = lines.map((line, i) => (i === index ? { ...line } : line));
  const row = next[index];
  for (const { key } of CALL_TYPE_AMOUNT_FIELDS) {
    row[key] = amounts[key];
  }
  const total = roundMoney(
    amounts.mobile +
      amounts.international +
      amounts.national +
      amounts.local +
      amounts.special +
      amounts.virtual +
      amounts.vce
  );
  row.lineTotal = total;
  row.noActivity = total === 0;
  return {
    ok: true,
    lines: next,
    movedToBilled: total > 0,
    clientCode: row.clientCode || '',
    total,
  };
}

/**
 * Mark a no-activity contract row as excluded (in-memory).
 * Caller is responsible for persisting the Smart Edge code to finance exclusions.
 */
export function excludeNoActivityLine(lines, index) {
  const source = lines[index];
  if (!source || !isNoActivityLine(source)) {
    return { ok: false, error: 'That row is not a no-activity line' };
  }
  const clientCode = String(source.clientCode || '').trim();
  if (!clientCode) {
    return { ok: false, error: 'Row has no Smart Edge code to exclude' };
  }
  const next = lines.map((line, i) =>
    i === index
      ? {
          ...line,
          excluded: true,
          unmatched: false,
          noActivity: false,
        }
      : line
  );
  return { ok: true, lines: next, clientCode };
}

/**
 * Move an excluded row into billed for this run (in-memory).
 */
export function includeExcludedLine(lines, index) {
  const source = lines[index];
  if (!source || !source.excluded) {
    return { ok: false, error: 'That row is not excluded' };
  }
  const clientCode = String(source.clientCode || '').trim();
  const next = lines.map((line, i) => {
    if (i !== index) return line;
    const row = {
      ...line,
      excluded: false,
      unmatched: false,
    };
    row.noActivity = lineAmount(row) === 0;
    return row;
  });
  return {
    ok: true,
    lines: next,
    clientCode,
    movedToBilled: lineAmount(next[index]) > 0,
    movedToNoActivity: lineAmount(next[index]) === 0,
  };
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
