const CALL_TYPES = [
  { key: 'totalMobile', name: 'Mobile', color: '#3B82F6' },
  { key: 'totalIntl', name: 'International', color: '#10B981' },
  { key: 'totalNational', name: 'National', color: '#F59E0B' },
  { key: 'totalLocal', name: 'Local', color: '#8B5CF6' },
  { key: 'totalSpecial', name: 'Special', color: '#EF4444' },
  { key: 'totalVirtual', name: 'Virtual', color: '#06B6D4' },
  { key: 'totalVce', name: 'VCE', color: '#F97316' },
];

function periodKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function calendarPeriods(count, fromDate = new Date()) {
  const periods = [];
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    periods.unshift(periodKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return periods;
}

export function latestRunByPeriod(runs = []) {
  const map = new Map();
  for (const run of runs) {
    const period = String(run.period || '').trim();
    if (!period || map.has(period)) continue;
    map.set(period, run);
  }
  return map;
}

export function monthlyTrendData(runs = [], months = 12, fromDate = new Date()) {
  const byPeriod = latestRunByPeriod(runs);
  return calendarPeriods(months, fromDate).map((period) => {
    const run = byPeriod.get(period);
    return {
      period,
      grandTotal: run ? Number(run.grandTotal) || 0 : null,
    };
  });
}

export function monthlyBilledData(runs = [], months = 6, fromDate = new Date()) {
  const byPeriod = latestRunByPeriod(runs);
  return calendarPeriods(months, fromDate).map((period) => {
    const run = byPeriod.get(period);
    return {
      period,
      billed: run ? Number(run.totalBilled) || 0 : 0,
    };
  });
}

export function callTypeBreakdownData(run) {
  if (!run) return [];
  return CALL_TYPES
    .map((item) => ({
      name: item.name,
      value: Number(run[item.key]) || 0,
      fill: item.color,
    }))
    .filter((item) => item.value > 0);
}

export function hasTrendPoints(rows = []) {
  return rows.some((row) => row.grandTotal != null);
}
