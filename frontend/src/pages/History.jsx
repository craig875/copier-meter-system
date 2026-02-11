import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';

const History = () => {
  const { effectiveBranch } = useAuth();
  const now = new Date();
  // Initialize to January 2026 (first reading month) or current month if later
  const initialYear = now.getFullYear() < 2026 ? 2026 : now.getFullYear();
  const initialMonth = now.getFullYear() < 2026 ? 1 : now.getMonth() + 1;
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['readings', year, month, 'history', effectiveBranch],
    queryFn: () => readingsApi.get(year, month, true, effectiveBranch), // Include decommissioned for history
    enabled: !!year && !!month, // Ensure query runs when year/month are set
  });

  // Backend returns: { year, month, data, summary, ... }
  // Axios wraps it: { data: { year, month, data, summary, ... }, status, ... }
  // React Query's data is the axios response, so data.data is: { year, month, data, summary, ... }
  const machines = data?.data?.data || [];
  const summary = data?.data?.summary || {};

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error loading history</p>
          <p className="text-gray-600 text-sm">{error?.response?.data?.error || error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await readingsApi.export(year, month, effectiveBranch);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meter-readings-${effectiveBranch || 'all'}-${year}-${String(month).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error('Failed to export readings');
    } finally {
      setExporting(false);
    }
  };

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    // Prevent navigation before January 2026 (first reading month)
    if (newYear < 2026 || (newYear === 2026 && newMonth < 1)) {
      toast.error('Cannot navigate before January 2026 - this is the first reading month');
      return;
    }

    setMonth(newMonth);
    setYear(newYear);
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reading History</h1>
          <p className="text-gray-500">View and export historical meter readings</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div data-tour="history-month-nav" className="flex items-center bg-white rounded-lg shadow-sm border">
            <button
              onClick={() => changeMonth(-1)}
              disabled={year === 2026 && month === 1}
              className="p-2 hover:bg-gray-100 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 font-medium min-w-[160px] text-center">
              {monthName}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            data-tour="history-export"
            onClick={handleExport}
            disabled={exporting || summary.capturedCount === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Machines"
          value={summary.totalMachines}
          icon={FileSpreadsheet}
          color="blue"
        />
        <SummaryCard
          title="Captured"
          value={summary.capturedCount}
          icon={CheckCircle}
          color="green"
        />
        <SummaryCard
          title="Pending"
          value={summary.pendingCount}
          icon={FileSpreadsheet}
          color="yellow"
        />
      </div>

      {/* Readings Table */}
      <div data-tour="history-table" className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mono</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Colour</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No machines found for this month. {isLoading ? 'Loading...' : 'Try selecting a different month or check your branch filter.'}
                  </td>
                </tr>
              ) : (
                machines.map(({ machine, currentReading, previousReading }) => {
                // If there's no previous reading, this is the first reading - usage should be 0
                const isFirstReading = !previousReading;
                
                // For first readings, usage is always 0 (backend sets it to 0)
                // For subsequent readings, use the calculated usage from the backend
                const monoUsage = currentReading?.monoUsage ?? 0;
                const colourUsage = currentReading?.colourUsage ?? 0;
                const scanUsage = currentReading?.scanUsage ?? 0;
                const totalUsage = monoUsage + colourUsage + scanUsage;
                
                return (
                  <tr 
                    key={machine.id}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{machine.machineSerialNumber}</p>
                        <p className="text-sm text-gray-500">{machine.customer}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {machine.contractReference || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentReading?.monoReading != null ? (
                        <div>
                          <p className="font-medium">{currentReading.monoReading.toLocaleString()}</p>
                          {/* Only show usage if it's NOT a first reading */}
                          {!isFirstReading && currentReading.monoUsage != null && currentReading.monoUsage > 0 && (
                            <p className="text-xs text-gray-500">+{currentReading.monoUsage.toLocaleString()}</p>
                          )}
                          {isFirstReading && (
                            <p className="text-xs text-gray-400">First reading</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentReading?.colourReading != null ? (
                        <div>
                          <p className="font-medium">{currentReading.colourReading.toLocaleString()}</p>
                          {/* Only show usage if it's NOT a first reading */}
                          {!isFirstReading && currentReading.colourUsage != null && currentReading.colourUsage > 0 && (
                            <p className="text-xs text-gray-500">+{currentReading.colourUsage.toLocaleString()}</p>
                          )}
                          {isFirstReading && (
                            <p className="text-xs text-gray-400">First reading</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentReading?.scanReading != null ? (
                        <div>
                          <p className="font-medium">{currentReading.scanReading.toLocaleString()}</p>
                          {/* Only show usage if it's NOT a first reading */}
                          {!isFirstReading && currentReading.scanUsage != null && currentReading.scanUsage > 0 && (
                            <p className="text-xs text-gray-500">+{currentReading.scanUsage.toLocaleString()}</p>
                          )}
                          {isFirstReading && (
                            <p className="text-xs text-gray-400">First reading</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {currentReading ? (isFirstReading ? '0 (First)' : (totalUsage > 0 ? totalUsage.toLocaleString() : '0')) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      {currentReading?.note ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                          <p className="text-xs text-yellow-800 break-words">{currentReading.note}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {currentReading ? (
                        // Check if reading has actual values (not just a note)
                        (currentReading.monoReading != null || 
                         currentReading.colourReading != null || 
                         currentReading.scanReading != null) ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OK
                          </span>
                        ) : (
                          // Has reading record but only note, no actual readings
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Note Only
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">Not captured</span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

export default History;
