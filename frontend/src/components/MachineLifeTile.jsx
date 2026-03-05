import { Activity } from 'lucide-react';

/**
 * Square tile showing machine life - total mono+colour vs lifespan, remaining life
 * @param {Object} props
 * @param {number} props.totalReading - Combined mono + colour meter reading
 * @param {number|null} props.machineLife - Model's estimated lifespan (pages)
 * @param {number|null} props.lifePercentUsed - Percent of lifespan used (0-100+)
 */
const MachineLifeTile = ({
  totalReading = 0,
  machineLife,
  lifePercentUsed,
}) => {
  if (!machineLife || machineLife <= 0) {
    return (
      <div className="tile-card p-4 w-64 h-64 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-gray-500" />
          Machine Life Cycle
        </h3>
        <p className="text-gray-500 text-xs flex-1">
          No life cycle configured for this model.
        </p>
      </div>
    );
  }

  const remainingPages = Math.max(0, machineLife - totalReading);
  const remainingPercent = Math.max(0, 100 - (lifePercentUsed ?? 0));
  const isLow = (lifePercentUsed ?? 0) >= 80;
  const isExceeded = (lifePercentUsed ?? 0) >= 100;

  return (
    <div className="tile-card p-4 w-64 h-64 flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-gray-500" />
        Machine Life Cycle
      </h3>
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Used</span>
            <span className="font-medium text-gray-900">
              {totalReading.toLocaleString()} / {machineLife.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(lifePercentUsed ?? 0, 100)}%`,
                backgroundColor: isExceeded
                  ? '#b91c1c'
                  : isLow
                    ? '#d97706'
                    : '#10b981',
              }}
            />
          </div>
        </div>
        <div className="text-center">
          <p
            className={`text-2xl font-bold ${
              isExceeded ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'
            }`}
          >
            {remainingPages.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">pages remaining</p>
          <p className="text-xs text-gray-600 mt-1">
            ({remainingPercent}% of life cycle left)
          </p>
        </div>
      </div>
    </div>
  );
};

export default MachineLifeTile;
