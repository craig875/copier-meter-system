import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Printer, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import { readingsApi } from '../services/api';
import MeterBlocks from './MeterBlocks';
import MachineStatsTile from './MachineStatsTile';
import MachineLifeTile from './MachineLifeTile';
import MonthlyUsageCycleTile from './MonthlyUsageCycleTile';
import ThreeMonthAverageUsageTile from './ThreeMonthAverageUsageTile';

/**
 * One customer machine row: identity + badges on the left, same stat tiles as consumable machine page on the right.
 */
const CustomerMachineOverviewRow = ({ machine, partsDue = [], effectiveBranch }) => {
  const { data: readingsHistoryData, isLoading } = useQuery({
    queryKey: ['readings-history', machine.id, effectiveBranch],
    queryFn: () => readingsApi.getHistory(machine.id, 24, effectiveBranch).then((r) => r.data),
    enabled: !!machine.id,
  });

  const modelDisplay = machine.model
    ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim()
    : 'No model';
  const hasBadges = machine.nearEndOfLife || partsDue.length > 0;
  const readings = readingsHistoryData?.readings || [];

  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-6 py-6 border-b border-gray-100 last:border-b-0 last:pb-0 first:pt-0">
      <div className="shrink-0 xl:w-72">
        <Link
          to={`/consumables/machines/${machine.id}`}
          className="group flex rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:bg-gray-50/80 transition-colors"
        >
          {hasBadges && (
            <div className="flex flex-col items-center justify-center w-12 flex-shrink-0 pr-4 border-r border-gray-200 gap-1">
              {machine.nearEndOfLife && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                  title={`Near end of life (${machine.lifePercentUsed}% of ${machine.model?.machineLife?.toLocaleString()} life cycle)`}
                >
                  <AlertCircle className="h-3 w-3" />
                </span>
              )}
              {partsDue.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  title={partsDue
                    .map(
                      (p) =>
                        `${p.partName}: ${p.usage.toLocaleString()} / ${p.expectedYield.toLocaleString()} clicks (${p.percentUsed}% of yield)`
                    )
                    .join('\n')}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {partsDue.length}
                </span>
              )}
            </div>
          )}
          <div className={`flex-1 min-w-0 flex flex-col ${hasBadges ? 'pl-4' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
                <MeterBlocks isColour={machine.model?.modelType === 'colour'} />
              </div>
              <p className="font-medium text-gray-900 truncate">{machine.machineSerialNumber}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2 truncate">{modelDisplay}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-600 group-hover:text-red-700">
              Machine details
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center gap-3 text-gray-500 py-8 pl-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-sm">Loading usage stats…</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            <MachineStatsTile readings={readings} isColour={machine.model?.modelType === 'colour'} />
            <MachineLifeTile
              totalReading={
                machine.totalReading ??
                (readings[0]
                  ? (readings[0].monoReading ?? 0) + (readings[0].colourReading ?? 0)
                  : 0)
              }
              machineLife={machine.model?.machineLife ?? null}
              lifePercentUsed={machine.lifePercentUsed ?? null}
            />
            <MonthlyUsageCycleTile machineLife={machine.model?.machineLife ?? null} readings={readings} />
            <ThreeMonthAverageUsageTile readings={readings} isColour={machine.model?.modelType === 'colour'} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerMachineOverviewRow;
