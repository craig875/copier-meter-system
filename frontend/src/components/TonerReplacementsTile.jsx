import { AlertTriangle, ChevronRight } from 'lucide-react';

const TONER_COLORS = {
  black: '#1f2937',
  cyan: '#06b6d4',
  magenta: '#ec4899',
  yellow: '#eab308',
  default: '#6b7280',
};

/**
 * Square tile showing estimated toner levels based on meter readings.
 * Uses same calculation as toner alerts: usage since last order vs expected yield.
 * @param {Object} props
 * @param {Array} props.modelParts - Model parts (toner) with expectedYield, meterType
 * @param {Array} props.replacements - Part replacement history
 * @param {Object} props.latestReading - Most recent reading { monoReading, colourReading }
 */
const TonerReplacementsTile = ({
  modelParts = [],
  replacements = [],
  latestReading,
}) => {
  // Same calculation as toner alerts: usage = currentMeter - priorMeter (from last order)
  const tonerLevels = modelParts
    .filter((p) => p.partType === 'toner')
    .map((part) => {
      const latestRep = [...replacements]
        .filter((r) => r.partName === part.partName)
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];
      if (!latestRep) return null;
      const priorMeter = latestRep.currentReading ?? 0;
      const currentMeter = latestReading
        ? part.meterType === 'colour'
          ? latestReading.colourReading ?? latestReading.monoReading ?? 0
          : part.meterType === 'total'
            ? (latestReading.monoReading ?? 0) + (latestReading.colourReading ?? 0)
            : latestReading.monoReading ?? 0
        : 0;
      const usage = Math.max(0, currentMeter - priorMeter);
      const expectedYield = part.expectedYield || 1;
      const percentUsed = Math.round((usage / expectedYield) * 100);
      const isDue = percentUsed >= 100;
      return {
        partName: part.partName,
        usage,
        expectedYield,
        percentUsed: Math.min(100, percentUsed),
        percentUsedRaw: percentUsed,
        isDue,
        tonerColor: part.tonerColor || 'default',
      };
    })
    .filter(Boolean);

  return (
    <div className="tile-card p-4 w-64 h-64 flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Toner levels</h3>
      {tonerLevels.length === 0 ? (
        <p className="text-gray-500 text-xs flex-1">
          No toner data yet. Order a consumable to track levels.
        </p>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {tonerLevels.map((t) => (
              <div key={t.partName} className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: TONER_COLORS[t.tonerColor] || TONER_COLORS.default,
                      }}
                    />
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {t.partName}
                    </span>
                    {t.isDue && (
                      <AlertTriangle
                        className="h-3 w-3 text-amber-600 flex-shrink-0"
                        title="Toner due"
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] flex-shrink-0 ${
                      t.isDue ? 'text-amber-600 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {t.percentUsedRaw >= 100 ? 'Due' : `${t.percentUsed}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(t.percentUsed, 100)}%`,
                      backgroundColor: t.isDue
                        ? '#d97706'
                        : TONER_COLORS[t.tonerColor] || TONER_COLORS.default,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <a
            href="#toner-section"
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium mt-2 pt-2 border-t border-gray-200"
          >
            View details
            <ChevronRight className="h-3 w-3" />
          </a>
        </>
      )}
    </div>
  );
};

export default TonerReplacementsTile;
