import { Activity } from 'lucide-react';

/**
 * Square tile showing machine life - total mono+colour vs lifespan, remaining life
 * @param {Object} props
 * @param {number} props.totalReading - Combined mono + colour meter reading
 * @param {number|null} props.machineLife - Model's estimated lifespan (pages)
 * @param {number|null} props.lifePercentUsed - Percent of lifespan used (0-100+)
 * @param {boolean} [props.compact] - Smaller tile for dense layouts
 */
const MachineLifeTile = ({
  totalReading = 0,
  machineLife,
  lifePercentUsed,
  compact = false,
}) => {
  const box = compact ? 'tile-card p-2.5 w-48 h-36' : 'tile-card p-4 w-64 h-64';
  const titleCls = `font-semibold text-gray-900 flex items-center gap-1 ${compact ? 'text-[11px] mb-0.5' : 'text-sm mb-2'}`;
  if (!machineLife || machineLife <= 0) {
    return (
      <div className={`${box} flex flex-col`}>
        <h3 className={titleCls}>
          <Activity className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
          {compact ? 'Life cycle' : 'Machine Life Cycle'}
        </h3>
        <p className={`text-gray-500 flex-1 leading-tight ${compact ? 'text-[9px]' : 'text-xs'}`}>
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
    <div className={`${box} flex flex-col overflow-hidden`}>
      <h3 className={titleCls}>
        <Activity className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
        {compact ? 'Life cycle' : 'Machine Life Cycle'}
      </h3>
      <div className={`flex-1 flex flex-col justify-center min-h-0 ${compact ? 'space-y-1' : 'space-y-4'}`}>
        <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
          <div className={`flex justify-between ${compact ? 'text-[9px]' : 'text-xs'}`}>
            <span className="text-gray-500">Used</span>
            <span className="font-medium text-gray-900">
              {totalReading.toLocaleString()} / {machineLife.toLocaleString()}
            </span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-3'}`}>
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
        <div className={`text-center ${compact ? 'leading-tight' : ''}`}>
          <p
            className={`font-bold ${
              isExceeded ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'
            } ${compact ? 'text-sm tabular-nums' : 'text-2xl'}`}
          >
            {remainingPages.toLocaleString()}
          </p>
          <p className={`text-gray-500 ${compact ? 'text-[8px] mt-0' : 'text-[10px] mt-0.5'}`}>
            {compact ? 'pages left' : 'pages remaining'}
          </p>
          <p className={`text-gray-600 ${compact ? 'text-[8px] mt-0 leading-tight' : 'text-xs mt-1'}`}>
            ({remainingPercent}% left)
          </p>
        </div>
      </div>
    </div>
  );
};

export default MachineLifeTile;
