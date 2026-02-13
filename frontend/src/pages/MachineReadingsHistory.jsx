import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readingsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';

const MachineReadingsHistory = () => {
  const { machineId } = useParams();
  const { effectiveBranch } = useAuth();

  const { data: machineData, isLoading: machineLoading } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => machinesApi.getOne(machineId).then((r) => r.data),
    enabled: !!machineId,
  });

  const { data: readingsData, isLoading: readingsLoading } = useQuery({
    queryKey: ['readings-history', machineId, effectiveBranch],
    queryFn: () => readingsApi.getHistory(machineId, 24, effectiveBranch).then((r) => r.data),
    enabled: !!machineId,
  });

  const machine = machineData?.machine;
  const readings = readingsData?.readings || [];

  if (machineLoading || readingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Machine not found</p>
        <Link to="/consumables/summary" className="text-red-600 hover:underline mt-2 inline-block">
          ← Back to Summary
        </Link>
      </div>
    );
  }

  const machineLabel = `${machine.machineSerialNumber}${machine.model ? ` • ${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim() : ''}`;

  return (
    <div className="space-y-6">
      <Link
        to={`/consumables/machines/${machineId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to machine
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meter reading history</h1>
        <p className="text-gray-500 mt-1">{machineLabel}</p>
      </div>

      <div className="liquid-glass rounded-xl overflow-hidden">
        {readings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No meter readings yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Month/Year</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Mono</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Colour</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Scan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Usage</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {readings.map((r) => {
                  const usage = (r.monoUsage ?? 0) + (r.colourUsage ?? 0) + (r.scanUsage ?? 0);
                  const monthName = new Date(r.year, r.month - 1).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <tr key={r.id || `${r.machineId}-${r.year}-${r.month}`} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{monthName}</td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {r.monoReading?.toLocaleString() ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {r.colourReading?.toLocaleString() ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {r.scanReading?.toLocaleString() ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {usage.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {r.capturedAt
                          ? new Date(r.capturedAt).toLocaleString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineReadingsHistory;
