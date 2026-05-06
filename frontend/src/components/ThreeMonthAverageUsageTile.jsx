import { TrendingUp } from 'lucide-react';

/**
 * Average monthly usage (mono / colour / scan) over the latest three month records
 * (most recent by year/month), re-evaluated whenever readings update.
 * @param {boolean} [props.compact] - Smaller tile for dense layouts
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

const ThreeMonthAverageUsageTile = ({ readings = [], isColour, compact = false }) => {
  const avg = computeThreeMonthAverages(readings);
  const box = compact
    ? 'tile-card p-2.5 w-48 h-36 flex flex-col overflow-hidden'
    : 'tile-card p-4 w-64 h-64 flex flex-col overflow-hidden';

  if (!avg) {
    return (
      <div className={box}>
        <h3 className={`font-semibold text-gray-900 flex items-center gap-1 ${compact ? 'text-[11px] mb-0.5' : 'text-sm mb-2'}`}>
          <TrendingUp className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
          {compact ? '3-mo avg' : '3-month avg usage'}
        </h3>
        <p className={`text-gray-500 flex-1 ${compact ? 'text-[9px] leading-tight' : 'text-xs'}`}>No meter readings yet.</p>
      </div>
    );
  }

  const { mono, colour, scan, count, months } = avg;
  const chronological = [...months].sort((a, b) => a.year - b.year || a.month - b.month);
  const rangeShort =
    chronological.length > 0
      ? `${new Date(chronological[0].year, chronological[0].month - 1).toLocaleString('default', { month: 'short', year: '2-digit' })}–${new Date(chronological[chronological.length - 1].year, chronological[chronological.length - 1].month - 1).toLocaleString('default', { month: 'short', year: '2-digit' })}`
      : '';

  const fmt = (v) => Math.round(v).toLocaleString();

  return (
    <div className={box}>
      <h3 className={`font-semibold text-gray-900 flex items-center gap-1 ${compact ? 'text-[11px] mb-0.5' : 'text-sm mb-1'}`}>
        <TrendingUp className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
        {compact ? '3-mo avg' : '3-month avg usage'}
      </h3>
      <p className={`text-gray-500 mb-1 leading-tight shrink-0 ${compact ? 'text-[9px]' : 'text-xs'}`}>
        {compact
          ? `${count} mo avg${rangeShort ? ` · ${rangeShort}` : ''}`
          : `Avg over ${count} month${count !== 1 ? 's' : ''}${rangeShort ? ` · ${rangeShort}` : ''}`}
      </p>
      <div className={`flex-1 min-h-0 ${compact ? 'space-y-0.5 text-[10px]' : 'space-y-2 text-sm'}`}>
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
            <span className={`text-gray-400 ${compact ? 'text-[9px]' : 'text-xs'}`}>—</span>
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
