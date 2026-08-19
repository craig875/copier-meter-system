import { partitionBillingLines, totalOfLines } from './billingLineSets.js';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function partsValue(parts = []) {
  return round2(parts.reduce((sum, part) => sum + Number(part.amount || 0), 0));
}

export function logBillingStage(stage, details) {
  console.log(`[billing] ${stage}`, details);
}

export function logEngineParts(filename, engine, parts) {
  logBillingStage('engine output', {
    file: filename,
    engine,
    rows: parts.length,
    total: partsValue(parts),
  });
}

export function logMergedLines(lines, label = 'after engine merge') {
  logBillingStage(label, {
    rows: lines.length,
    total: round2(totalOfLines(lines)),
  });
}

export function logSplitTotals(lines, label = 'after contract matching') {
  const { billed, excluded, unmatched, noActivity } = partitionBillingLines(lines);
  const billedTotal = totalOfLines(billed);
  const excludedTotal = totalOfLines(excluded);
  const unmatchedTotal = totalOfLines(unmatched);
  logBillingStage(label, {
    billed: { rows: billed.length, total: round2(billedTotal) },
    excluded: { rows: excluded.length, total: round2(excludedTotal) },
    unmatched: { rows: unmatched.length, total: round2(unmatchedTotal) },
    noActivity: { rows: noActivity.length, total: round2(totalOfLines(noActivity)) },
    grandTotal: round2(billedTotal + excludedTotal + unmatchedTotal),
    rawLineTotal: round2(totalOfLines(lines)),
  });
}
