import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Usage Stats tile - usage graph
 * @param {Object} props
 * @param {Array} props.readings - Meter readings (year, month, monoUsage, colourUsage, scanUsage)
 * @param {boolean} props.isColour - Whether machine has colour
 * @param {boolean} [props.compact] - Smaller tile for dense layouts (e.g. customer overview)
 */
const MachineStatsTile = ({ readings = [], isColour, compact = false }) => {
  const box = compact ? 'tile-card p-3 w-52 h-52' : 'tile-card p-4 w-64 h-64';
  const chartMinH = compact ? 'min-h-[56px]' : 'min-h-[80px]';
  // Usage chart data: last 6 months, mono + colour + scan
  const usageChartData = [...readings]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-6)
    .map((r) => {
      const monoU = r.monoUsage ?? 0;
      const colourU = r.colourUsage ?? 0;
      const scanU = r.scanUsage ?? 0;
      return {
        month: new Date(r.year, r.month - 1).toLocaleString('default', {
          month: 'short',
          year: '2-digit',
        }),
        mono: monoU,
        colour: isColour ? colourU : 0,
        scan: scanU,
        total: monoU + colourU + scanU,
      };
    });

  const hasUsageData = usageChartData.length > 0;

  if (!hasUsageData) {
    return (
      <div className={`${box} flex flex-col`}>
        <h3 className={`font-semibold text-gray-900 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>Usage Stats</h3>
        <p className={`text-gray-500 flex-1 leading-snug ${compact ? 'text-[10px]' : 'text-xs'}`}>
          No usage or toner data yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`${box} flex flex-col overflow-hidden`}>
      <h3 className={`font-semibold text-gray-900 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>Usage Stats</h3>
      <div className={`flex-1 min-h-0 flex flex-col ${compact ? 'gap-1' : 'gap-3'}`}>
        {/* Usage over time - grouped bars (mono, colour, scan separate) */}
        {hasUsageData && (
          <div className="flex-1 min-h-0 flex flex-col">
            <h4
              className={`font-medium text-gray-700 ${compact ? 'text-[10px] mb-0.5' : 'text-xs mb-1'}`}
            >
              Usage by month
            </h4>
            <div className={`flex-1 min-h-0 ${chartMinH}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={usageChartData}
                  margin={{ top: 2, right: 2, left: 0, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: compact ? 7 : 9 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: compact ? 7 : 9 }}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                    tickLine={false}
                    width={compact ? 18 : 24}
                  />
                  <Tooltip
                    formatter={(value) => value?.toLocaleString()}
                    contentStyle={{ fontSize: compact ? 10 : 11, borderRadius: 6 }}
                  />
                  <Legend wrapperStyle={{ fontSize: compact ? 8 : 9 }} />
                  <Bar dataKey="mono" name="Mono" fill="#374151" radius={[2, 2, 0, 0]} barSize={compact ? 6 : 8} />
                  {isColour && (
                    <Bar dataKey="colour" name="Colour" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={compact ? 6 : 8} />
                  )}
                  <Bar dataKey="scan" name="Scan" fill="#ec4899" radius={[2, 2, 0, 0]} barSize={compact ? 6 : 8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MachineStatsTile;
