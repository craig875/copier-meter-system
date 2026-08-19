const LINE_TYPES = new Set(['billed', 'excluded', 'unmatched', 'noActivity']);

export function billingLineAmount(line = {}) {
  return (
    Number(line.mobile || 0) +
    Number(line.international || 0) +
    Number(line.national || 0) +
    Number(line.local || 0) +
    Number(line.special || 0) +
    Number(line.virtual || 0) +
    Number(line.vce || 0)
  );
}

export function toBillingRunLineCreate(line, lineType) {
  const type = LINE_TYPES.has(lineType) ? lineType : 'billed';
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
    lineTotal: billingLineAmount(line),
    lineType: type,
    confirmed: Boolean(line.confirmed),
  };
}

export function billedTotals(lines = []) {
  return lines.reduce(
    (acc, line) => {
      acc.totalMobile += Number(line.mobile || 0);
      acc.totalIntl += Number(line.international || 0);
      acc.totalNational += Number(line.national || 0);
      acc.totalLocal += Number(line.local || 0);
      acc.totalSpecial += Number(line.special || 0);
      acc.totalVirtual += Number(line.virtual || 0);
      acc.totalVce += Number(line.vce || 0);
      return acc;
    },
    {
      totalMobile: 0,
      totalIntl: 0,
      totalNational: 0,
      totalLocal: 0,
      totalSpecial: 0,
      totalVirtual: 0,
      totalVce: 0,
    }
  );
}

export function withLineTypeTotals(runs = [], groups = []) {
  const byRun = new Map();
  for (const group of groups) {
    const current = byRun.get(group.billingRunId) || {
      billed: 0,
      excluded: 0,
      unmatched: 0,
      noActivity: 0,
    };
    const type = LINE_TYPES.has(group.lineType) ? group.lineType : 'billed';
    current[type] += Number(group._sum?.lineTotal || 0);
    byRun.set(group.billingRunId, current);
  }
  return runs.map((run) => {
    const sums = byRun.get(run.id);
    if (!sums) {
      return {
        ...run,
        totalBilled: Number(run.grandTotal || 0),
        totalExcluded: 0,
        totalUnmatched: 0,
      };
    }
    return {
      ...run,
      totalBilled: sums.billed + sums.noActivity,
      totalExcluded: sums.excluded,
      totalUnmatched: sums.unmatched,
    };
  });
}
