import { TrendingUp } from 'lucide-react';

/**
 * Average monthly usage (mono / colour / scan) over the latest three month records
 * (most recent by year/month), re-evaluated whenever readings update.
 */
function latestMonths(readings, n) {
  return [...readings]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, n);
}

function computeThreeMonthAverages(readings) {
  const last = latestMonths(readings, 3);
  if (last.length === 0) return null;
  const n = last.length;
  const mono = last.reduce((s, r) => s + (r.monoUsage ?? 0), 0) / n;
  const colour = last.reduce((s, r) => s + (r.colourUsage ?? 0), 0) / n;
  const scan = last.reduce((s, r) => s + (r.scanUsage ?? 0), 0) / n;
  return { mono, colour, scan, count: n, months: last };
}

const ThreeMonthAverageUsageTile = ({ readings = [], isColour }) => {
  const avg = computeThreeMonthAverages(readings);

  if (!avg) {
    return (
      <div className="tile-card p-4 w-64 min-h-[200px] flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          3-month avg usage
        </h3>
        <p className="text-gray-500 text-xs flex-1">No meter readings yet.</p>
      </div>
    );
  }

  const { mono, colour, scan, count, months } = avg;
  const chronological = [...months].sort((a, b) => a.year - b.year || a.month - b.month);
  const rangeLabel = chronological
    .map((m) =>
      new Date(m.year, m.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
    )
    .join(' → ');

  const fmt = (v) => Math.round(v).toLocaleString();

  return (
    <div className="tile-card p-4 w-64 min-h-[200px] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-gray-500" />
        3-month avg usage
      </h3>
      <p className="text-[10px] text-gray-500 mb-3">
        Average monthly usage over the latest {count} month{count !== 1 ? 's' : ''} of data
        {rangeLabel ? ` (${rangeLabel})` : ''}.
      </p>
      <div className="space-y-2 text-sm flex-1">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-gray-600">Mono</span>
          <span className="font-semibold text-gray-900 tabular-nums">{fmt(mono)}</span>
        </div>
        {isColour ? (
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-gray-600">Colour</span>
            <span className="font-semibold text-cyan-700 tabular-nums">{fmt(colour)}</span>
          </div>
        ) : (
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-gray-600">Colour</span>
            <span className="text-gray-400 text-xs">—</span>
          </div>
        )}
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-gray-600">Scan</span>
          <span className="font-semibold text-pink-700 tabular-nums">{fmt(scan)}</span>
        </div>
      </div>
    </div>
  );
};

export default ThreeMonthAverageUsageTile;
