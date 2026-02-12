import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readingsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';

const MachineHistory = () => {
  const { machineId } = useParams();
  const { effectiveBranch } = useAuth();

  const { data: machineData, isLoading: machineLoading, error: machineError } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => machinesApi.getOne(machineId),
    enabled: !!machineId,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reading-history', machineId, effectiveBranch],
    queryFn: () => readingsApi.getHistory(machineId, 500, effectiveBranch),
    enabled: !!machineId,
  });

  const machine = machineData?.data?.machine;
  const readings = historyData?.data?.readings || [];

  if (machineLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (machineError || !machine) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Machine not found or access denied.</p>
        <Link to="/machines" className="mt-2 inline-flex items-center text-red-600 hover:text-red-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Machines
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/machines"
            className="inline-flex items-center text-sm text-gray-600 hover:text-red-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Machines
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {machine.machineSerialNumber}
          </h1>
          <p className="text-gray-500 mt-1">
            {machine.customer || 'No customer'} • {machine.branch}
          </p>
        </div>
      </div>

      {/* Readings Table */}
      <div className="liquid-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mono</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Colour</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saved</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Captured by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {historyLoading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-red-600 mx-auto" />
                  </td>
                </tr>
              ) : readings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No capture history for this machine yet.
                  </td>
                </tr>
              ) : (
                readings.map((reading) => {
                  const hasValues = reading.monoReading != null || reading.colourReading != null || reading.scanReading != null;
                  const totalUsage = (reading.monoUsage ?? 0) + (reading.colourUsage ?? 0) + (reading.scanUsage ?? 0);
                  const monthName = new Date(reading.year, reading.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                  return (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {monthName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reading.monoReading != null ? reading.monoReading.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reading.colourReading != null ? reading.colourReading.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reading.scanReading != null ? reading.scanReading.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {hasValues ? (totalUsage > 0 ? totalUsage.toLocaleString() : '0') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        {reading.note ? (
                          <span className="bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5 text-xs text-yellow-800 line-clamp-2">
                            {reading.note}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {reading.capturedAt
                          ? format(new Date(reading.capturedAt), 'dd MMM yyyy, HH:mm')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {reading.user?.name || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MachineHistory;
