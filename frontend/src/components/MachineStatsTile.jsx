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
 */
const MachineStatsTile = ({ readings = [], isColour }) => {
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
      <div className="tile-card p-4 w-64 h-64 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Usage Stats</h3>
        <p className="text-gray-500 text-xs flex-1">No usage or toner data yet.</p>
      </div>
    );
  }

  return (
    <div className="tile-card p-4 w-64 h-64 flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Usage Stats</h3>
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Usage over time - grouped bars (mono, colour, scan separate) */}
        {hasUsageData && (
          <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-xs font-medium text-gray-700 mb-1">Usage by month</h4>
            <div className="flex-1 min-h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={usageChartData}
                  margin={{ top: 2, right: 2, left: 0, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    formatter={(value) => value?.toLocaleString()}
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="mono" name="Mono" fill="#374151" radius={[2, 2, 0, 0]} barSize={8} />
                  {isColour && (
                    <Bar dataKey="colour" name="Colour" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={8} />
                  )}
                  <Bar dataKey="scan" name="Scan" fill="#ec4899" radius={[2, 2, 0, 0]} barSize={8} />
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
