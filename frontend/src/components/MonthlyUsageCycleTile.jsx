import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Square tile showing monthly usage cycle vs recommended volume.
 * Recommended = machineLife / 60 (monthly volume over 5-year lifespan).
 * Indicates if machine is overused (actual > recommended) per month.
 * @param {Object} props
 * @param {number|null} props.machineLife - Model's estimated lifespan (pages)
 * @param {Array} props.readings - Meter readings with monoUsage, colourUsage, year, month
 * @param {boolean} [props.compact] - Smaller tile for dense layouts
 */
const MonthlyUsageCycleTile = ({ machineLife, readings = [], compact = false }) => {
  const box = compact ? 'tile-card p-2.5 w-48 h-36' : 'tile-card p-4 w-64 h-64';
  const titleCls = `font-semibold text-gray-900 flex items-center gap-1 ${compact ? 'text-[11px] mb-0.5' : 'text-sm mb-2'}`;
  const monthlyRecommended = machineLife && machineLife > 0
    ? Math.round(machineLife / 60)
    : null;

  const usageData = [...readings]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 6)
    .map((r) => {
      const usage = (r.monoUsage ?? 0) + (r.colourUsage ?? 0);
      const overused = monthlyRecommended != null && usage > monthlyRecommended;
      return {
        month: new Date(r.year, r.month - 1).toLocaleString('default', {
          month: 'short',
          year: '2-digit',
        }),
        usage,
        overused,
      };
    });

  if (!monthlyRecommended) {
    return (
      <div className={`${box} flex flex-col`}>
        <h3 className={titleCls}>
          <Calendar className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
          Monthly usage
        </h3>
        <p className={`text-gray-500 flex-1 leading-tight ${compact ? 'text-[9px]' : 'text-xs'}`}>
          No lifespan configured. Set model lifespan to see recommended volume.
        </p>
      </div>
    );
  }

  const overusedCount = usageData.filter((d) => d.overused).length;
  const statusLabel =
    overusedCount === 0
      ? 'Fair'
      : overusedCount === usageData.length
        ? 'Overused'
        : `${overusedCount}/${usageData.length} over`;

  return (
    <div className={`${box} flex flex-col overflow-hidden`}>
      <h3 className={titleCls}>
        <Calendar className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
        Monthly usage
      </h3>
      <div className={compact ? 'mb-0.5' : 'mb-2'}>
        <p className={`text-gray-500 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          Recommended: {monthlyRecommended.toLocaleString()}/mo
        </p>
        <p className={`font-medium mt-0.5 ${compact ? 'text-[9px]' : 'text-xs'}`}>
          {overusedCount === 0 ? (
            <span className="text-green-600 inline-flex items-center gap-1">
              <CheckCircle className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
              {statusLabel}
            </span>
          ) : (
            <span className="text-amber-600 inline-flex items-center gap-1">
              <AlertTriangle className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
              {statusLabel}
            </span>
          )}
        </p>
      </div>
      <div className={`flex-1 min-h-0 overflow-y-auto ${compact ? '' : 'space-y-1.5'}`}>
        {usageData.length === 0 ? (
          <p className={`text-gray-500 ${compact ? 'text-[9px]' : 'text-xs'}`}>No readings yet.</p>
        ) : (
          usageData.map((d) => (
            <div
              key={d.month}
              className={`flex items-center justify-between border-b border-gray-100 last:border-0 ${compact ? 'py-px' : 'py-1'}`}
            >
              <span className={`text-gray-700 ${compact ? 'text-[9px]' : 'text-xs'}`}>{d.month}</span>
              <span className={`font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}>
                {d.usage.toLocaleString()}
                {d.overused && (
                  <span className="ml-1 text-amber-600" title="Over recommended volume">
                    ↑
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MonthlyUsageCycleTile;
