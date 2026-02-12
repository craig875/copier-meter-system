import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { consumablesApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const ConsumablesSummary = () => {
  const { effectiveBranch } = useAuth();
  const [partTypeFilter, setPartTypeFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['consumables-summary', effectiveBranch, partTypeFilter, complianceFilter],
    queryFn: () => consumablesApi.getSummary({
      branch: effectiveBranch,
      partType: partTypeFilter || undefined,
      complianceStatus: complianceFilter || undefined,
    }),
  });

  const rows = data?.rows || [];
  const machines = data?.machines || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Error loading consumables: {error?.response?.data?.error || error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="liquid-glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumable Summary</h2>
        <p className="text-sm text-gray-600 mb-4">View consumable status per machine. Click a row to see full history.</p>

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Part type</label>
            <select
              value={partTypeFilter}
              onChange={(e) => setPartTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              <option value="general">General</option>
              <option value="toner">Toner</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Yield compliance</label>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              <option value="met">Met</option>
              <option value="not_met">Not Met</option>
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No consumable records yet. Record a part order from a machine detail page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Serial</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Model</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Part</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Last order</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-700">Usage</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-700">Charge</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.machineId}-${row.partName}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <Link
                        to={`/consumables/machines/${row.machineId}`}
                        className="font-medium text-red-600 hover:underline"
                      >
                        {row.machineSerialNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{row.model || '-'}</td>
                    <td className="py-3 px-2">{row.partName}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {row.lastOrderDate ? new Date(row.lastOrderDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-2 text-right">{row.usage?.toLocaleString() ?? '-'}</td>
                    <td className="py-3 px-2 text-center">
                      {row.yieldMet ? (
                        <span className="inline-flex items-center text-green-600 text-xs">
                          <CheckCircle className="h-4 w-4 mr-1" /> Met
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-600 text-xs">
                          <AlertTriangle className="h-4 w-4 mr-1" /> Shortfall
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {row.displayChargeRand > 0 ? (
                        <span className="font-medium text-amber-700">R{Number(row.displayChargeRand).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        to={`/consumables/machines/${row.machineId}`}
                        className="text-red-600 hover:text-red-700"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {machines.length > 0 && rows.length === 0 && (
        <div className="liquid-glass rounded-xl p-6">
          <p className="text-gray-600 mb-2">You have {machines.length} machine(s). Click below to record consumable orders:</p>
          <div className="flex flex-wrap gap-2">
            {machines.slice(0, 10).map((m) => (
              <Link
                key={m.id}
                to={`/consumables/machines/${m.id}`}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
              >
                {m.machineSerialNumber}
              </Link>
            ))}
            {machines.length > 10 && <span className="text-gray-500 self-center">...</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumablesSummary;
