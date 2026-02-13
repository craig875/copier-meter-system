import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { consumablesApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, ChevronRight, AlertTriangle, CheckCircle, Upload, Download, X } from 'lucide-react';
import { useState } from 'react';

const ConsumablesSummary = () => {
  const queryClient = useQueryClient();
  const { effectiveBranch, isAdmin } = useAuth();
  const [partTypeFilter, setPartTypeFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

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

  const importOrdersMutation = useMutation({
    mutationFn: (data) => consumablesApi.importPartOrders(data),
    onSuccess: (result) => {
      const { succeeded, failed } = result;
      if (failed.length > 0) {
        toast(`${succeeded} imported, ${failed.length} failed`, { icon: succeeded > 0 ? '⚠️' : '❌' });
      } else {
        toast.success(`${succeeded} past order(s) imported`);
      }
      setShowImportModal(false);
      setImportPreview(null);
      setImportErrors([]);
      queryClient.invalidateQueries(['consumables-summary']);
      queryClient.invalidateQueries(['consumables-history']);
      queryClient.invalidateQueries(['toner-alerts']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Import failed');
    },
  });

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else current += c;
    }
    result.push(current.trim());
    return result;
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) {
      setImportErrors(['Please select a CSV file']);
      setImportPreview(null);
      return;
    }
    setImportErrors([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result || '';
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setImportErrors(['CSV must have header row and at least one data row']);
          setImportPreview(null);
          return;
        }
        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, '').trim());
        const getVal = (raw, keys) => {
          for (const k of keys) {
            const v = raw[k];
            if (v !== undefined && v !== '' && v !== null) return String(v).trim();
          }
          return '';
        };
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, '').trim());
          const raw = {};
          headers.forEach((h, idx) => {
            raw[h] = vals[idx] ?? '';
          });
          const serial = getVal(raw, ['machine_serial_number', 'machine serial number', 'serial number', 'serial']);
          if (!serial) continue;
          const prior = parseInt(getVal(raw, ['prior_reading', 'prior reading']), 10);
          const current = parseInt(getVal(raw, ['current_reading', 'current reading']), 10);
          const itemCode = getVal(raw, ['item_code', 'item code']);
          const partName = getVal(raw, ['part_name', 'part name']);
          if (!itemCode && !partName) continue;
          const orderDate = getVal(raw, ['order_date', 'order date']) || new Date().toISOString().slice(0, 10);
          const tonerPct = getVal(raw, ['toner_percent', 'toner percent']);
          data.push({
            machine_serial_number: serial,
            item_code: itemCode || undefined,
            part_name: partName || undefined,
            order_date: orderDate,
            prior_reading: isNaN(prior) ? 0 : prior,
            current_reading: isNaN(current) ? 0 : current,
            toner_percent: tonerPct !== '' ? parseFloat(tonerPct) : undefined,
          });
        }
        if (data.length === 0) {
          setImportErrors(['No valid rows found']);
          setImportPreview(null);
          return;
        }
        setImportPreview({ data, totalRows: data.length });
      } catch (err) {
        setImportErrors([`Parse error: ${err.message}`]);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportSubmit = () => {
    if (!importPreview?.data?.length) {
      toast.error('No data to import');
      return;
    }
    importOrdersMutation.mutate(importPreview.data);
  };

  const downloadImportTemplate = () => {
    const csv = 'machine_serial_number,item_code,part_name,order_date,prior_reading,current_reading,toner_percent\n' +
      'CPR-001,DR-101,,2024-06-15,95000,100000,\n' +
      'CPR-001,CT-C,,2024-06-15,18000,20000,15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'past-orders-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Consumable Summary</h2>
            <p className="text-sm text-gray-600 mt-1">View consumable status per machine. Click a row to see full history.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Import past orders
            </button>
          )}
        </div>

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

      {/* Import past orders modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="liquid-glass rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Import past toner orders</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setImportErrors([]);
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV with past orders. Columns: machine_serial_number, item_code (or part_name), order_date,
              prior_reading, current_reading, toner_percent (optional for toner).
            </p>
            {importErrors.length > 0 && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {importErrors.join(', ')}
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={downloadImportTemplate}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Download className="h-4 w-4" />
                Download template
              </button>
              <label className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                <Upload className="h-4 w-4" />
                Select CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportFileChange}
                />
              </label>
            </div>
            {importPreview && (
              <>
                <p className="text-sm text-gray-600 mb-2">{importPreview.totalRows} row(s) to import</p>
                <div className="max-h-48 overflow-y-auto border rounded mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Serial</th>
                        <th className="px-2 py-1 text-left">Part</th>
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-right">Prior</th>
                        <th className="px-2 py-1 text-right">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.data.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{r.machine_serial_number}</td>
                          <td className="px-2 py-1">{r.item_code || r.part_name || '-'}</td>
                          <td className="px-2 py-1">{r.order_date}</td>
                          <td className="px-2 py-1 text-right">{r.prior_reading?.toLocaleString()}</td>
                          <td className="px-2 py-1 text-right">{r.current_reading?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.data.length > 10 && (
                    <p className="px-2 py-1 text-xs text-gray-500">... and {importPreview.data.length - 10} more</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={importOrdersMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importOrdersMutation.isPending ? 'Importing...' : `Import ${importPreview.data.length} order(s)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
