import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Square tile showing monthly usage cycle vs recommended volume.
 * Recommended = machineLife / 60 (monthly volume over 5-year lifespan).
 * Indicates if machine is overused (actual > recommended) per month.
 * @param {Object} props
 * @param {number|null} props.machineLife - Model's estimated lifespan (pages)
 * @param {Array} props.readings - Meter readings with monoUsage, colourUsage, year, month
 */
const MonthlyUsageCycleTile = ({ machineLife, readings = [] }) => {
  const monthlyRecommended = machineLife && machineLife > 0
    ? Math.round(machineLife / 60)
    : null;

  const usageData = [...readings]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-6)
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
      <div className="tile-card p-4 w-64 h-64 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-500" />
          Monthly usage
        </h3>
        <p className="text-gray-500 text-xs flex-1">
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
    <div className="tile-card p-4 w-64 h-64 flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <Calendar className="h-4 w-4 text-gray-500" />
        Monthly usage
      </h3>
      <div className="mb-2">
        <p className="text-[10px] text-gray-500">Recommended: {monthlyRecommended.toLocaleString()}/mo</p>
        <p className="text-xs font-medium mt-0.5">
          {overusedCount === 0 ? (
            <span className="text-green-600 inline-flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
          ) : (
            <span className="text-amber-600 inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
          )}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {usageData.length === 0 ? (
          <p className="text-gray-500 text-xs">No readings yet.</p>
        ) : (
          usageData.map((d) => (
            <div
              key={d.month}
              className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0"
            >
              <span className="text-xs text-gray-700">{d.month}</span>
              <span className="text-xs font-medium">
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
