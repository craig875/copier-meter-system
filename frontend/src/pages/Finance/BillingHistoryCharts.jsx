import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatZar, formatZarCompact } from './formatZar';
import {
  callTypeBreakdownData,
  hasTrendPoints,
  monthlyBilledData,
  monthlyTrendData,
} from './billingHistoryChartData';

const RED = '#dc2626';

function ChartCard({ title, hint, children }) {
  return (
    <div className="tile-card p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">{hint}</p>
      <div className="h-72">{children}</div>
    </div>
  );
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const heading = label || payload[0]?.name;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      {heading ? <p className="font-medium text-gray-700 mb-1">{heading}</p> : null}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} style={{ color: item.color || item.payload?.fill }}>
          {item.name}: {formatZar(item.value)}
        </p>
      ))}
    </div>
  );
}

export default function BillingHistoryCharts({ runs = [], latest }) {
  const trend = monthlyTrendData(runs, 12);
  const billedBars = monthlyBilledData(runs, 6);
  const callTypes = callTypeBreakdownData(latest);
  const showTrend = hasTrendPoints(trend);
  const showBilledBars = billedBars.some((row) => row.billed);

  if (!showTrend && !showBilledBars && callTypes.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2">
        <ChartCard
          title="Monthly grand total"
          hint="Latest run per period · last 12 months"
        >
          {showTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  width={64}
                  tickFormatter={formatZarCompact}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="grandTotal"
                  name="Grand total"
                  stroke={RED}
                  strokeWidth={2}
                  dot={{ r: 3, fill: RED }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 h-full flex items-center justify-center">No period totals yet</p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Call types · latest run"
        hint={latest?.period ? `Period ${latest.period}` : 'Billed split by call type'}
      >
        {callTypes.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={callTypes}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={1}
              >
                {callTypes.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<MoneyTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500 h-full flex items-center justify-center">No call-type totals</p>
        )}
      </ChartCard>

      <div className="xl:col-span-3">
        <ChartCard
          title="Total billed by month"
          hint="Latest run per period · last 6 months"
        >
          {showBilledBars ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billedBars} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  width={64}
                  tickFormatter={formatZarCompact}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="billed" name="Total billed" fill={RED} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 h-full flex items-center justify-center">No billed totals yet</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
