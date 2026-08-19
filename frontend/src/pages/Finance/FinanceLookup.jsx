import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { trimLeading } from '../../utils/string';
import { downloadLookupCsv, lookupRowsToCsv, parseLookupCsv } from './lookupCsv';

const emptyRow = () => ({ customerName: '', smartEdgeCode: '' });

export default function FinanceLookup() {
  const queryClient = useQueryClient();
  const { can, effectiveBranch } = useAuth();
  const canView = can('finance.lookup.view') || can('finance.billing.view');
  const canManage = can('finance.lookup.manage');
  const [rows, setRows] = useState([emptyRow()]);
  const importInputRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance', 'lookup', effectiveBranch],
    queryFn: () => financeApi.getLookup(effectiveBranch),
    enabled: canView && Boolean(effectiveBranch),
  });

  useEffect(() => {
    if (!data) return;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    setRows(
      entries.length
        ? entries.map((e) => ({
            customerName: e.customerName || '',
            smartEdgeCode: e.smartEdgeCode || '',
          }))
        : [emptyRow()]
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const lookup = {};
      rows.forEach((row) => {
        const name = row.customerName.trim();
        if (!name) return;
        lookup[name] = row.smartEdgeCode.trim();
      });
      return financeApi.saveLookup(effectiveBranch, lookup);
    },
    onSuccess: (res) => {
      toast.success(`Saved ${res.saved ?? 0} lookup entries`);
      queryClient.invalidateQueries({ queryKey: ['finance', 'lookup', effectiveBranch] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save lookup'),
  });

  const importMutation = useMutation({
    mutationFn: (lookup) => financeApi.saveLookup(effectiveBranch, lookup),
    onSuccess: (res) => {
      toast.success(`Imported ${res.saved ?? 0} lookup entries`);
      queryClient.invalidateQueries({ queryKey: ['finance', 'lookup', effectiveBranch] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to import lookup CSV'),
  });

  const handleExport = () => {
    const csv = lookupRowsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadLookupCsv(`engine3-lookup-${effectiveBranch || 'branch'}-${stamp}.csv`, csv);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const lookup = parseLookupCsv(text);
      const count = Object.keys(lookup).length;
      if (count === 0) {
        toast.error('No lookup rows found in that CSV');
        return;
      }
      importMutation.mutate(lookup);
    } catch (err) {
      toast.error(err?.message || 'Could not read CSV');
    }
  };

  if (!canView) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to Engine 3 lookup.
      </div>
    );
  }

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engine 3 lookup</h1>
          <p className="text-gray-500 mt-1">Map customer names to Smart Edge client codes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importMutation.isPending ? 'Importing...' : 'Import CSV'}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  handleImportFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save lookup'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error.response?.data?.error || 'Failed to load lookup'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Smart Edge code</th>
                {canManage ? <th className="px-4 py-3 w-12" /> : null}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <input
                      value={row.customerName}
                      onChange={(e) => updateRow(index, 'customerName', trimLeading(e.target.value))}
                      disabled={!canManage}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                      placeholder="Customer name"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.smartEdgeCode}
                      onChange={(e) => updateRow(index, 'smartEdgeCode', trimLeading(e.target.value))}
                      disabled={!canManage}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                      placeholder="CODE"
                    />
                  </td>
                  {canManage ? (
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)))}
                        className="p-1.5 text-gray-500 hover:text-red-600"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage && !isLoading && !error && (
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add row
        </button>
      )}
    </div>
  );
}
