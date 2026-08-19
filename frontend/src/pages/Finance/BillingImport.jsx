import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Eraser, FileSpreadsheet, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { financeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatZar } from './formatZar';
import {
  detectEngine,
  engineLabel,
  mergeUnmatchedIntoCode,
  mergeWithContracts,
  processBillingFiles,
} from './billingProcess';
import UnmatchedMergeControl from './UnmatchedMergeControl';
import UnmatchedCodeEditor from './UnmatchedCodeEditor';
import BillingRunTotals from './BillingRunTotals';
import {
  confirmKey,
  isNoActivityLine,
  partitionBillingLines,
  smartEdgeExportLines,
  toBillingSaveLine,
  totalOfLines,
} from './billingLineSets';
import NoActivityConfirmControl from './NoActivityConfirmControl';
import { billingLinesToCsv, downloadBillingCsv } from './billingCsv';
import { logSplitTotals } from './billingDebug';
import { readContractFile } from './contractReport';
import {
  clearBillingImportSession,
  fileToPayload,
  loadBillingImportSession,
  saveBillingImportSession,
} from './billingImportSession';

function defaultPeriod() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

const ENGINE_BADGE = {
  engine1: 'bg-blue-100 text-blue-800',
  engine2: 'bg-violet-100 text-violet-800',
  engine3: 'bg-teal-100 text-teal-800',
  contract: 'bg-purple-100 text-purple-800',
};

const TABLE_HEADERS = [
  'Code',
  'Customer Name',
  'Category',
  'Mobile',
  'International',
  'National',
  'Local',
  'Special',
  'Virtual',
  'VCE',
];

export default function BillingImport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const { can, effectiveBranch } = useAuth();
  const canProcess = can('finance.billing.process') || can('finance.billing.view');
  const canSave = can('finance.billing.save');

  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const [processing, setProcessing] = useState(false);
  const [lines, setLines] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [lineFilter, setLineFilter] = useState('all');
  const [confirmedCodes, setConfirmedCodes] = useState(() => new Set());
  const skipPersist = useRef(true);

  useEffect(() => {
    skipPersist.current = true;
    const saved = loadBillingImportSession(effectiveBranch);
    if (saved) {
      setItems(saved.items);
      setLines(saved.lines);
      setWarnings(saved.warnings);
      setConfirmedCodes(new Set(saved.confirmedCodes || []));
      if (saved.period) setPeriod(saved.period);
    } else {
      setItems([]);
      setLines([]);
      setWarnings([]);
      setConfirmedCodes(new Set());
      setPeriod(defaultPeriod());
    }
    const id = window.setTimeout(() => {
      skipPersist.current = false;
    }, 0);
    return () => window.clearTimeout(id);
  }, [effectiveBranch]);

  useEffect(() => {
    if (skipPersist.current) return;
    const ok = saveBillingImportSession(effectiveBranch, {
      items,
      lines,
      warnings,
      period,
      confirmedCodes: [...confirmedCodes],
    });
    if (!ok) {
      toast.error('Could not keep files in this session (storage full). Stay on this page until you save.');
    }
  }, [effectiveBranch, items, lines, warnings, period, confirmedCodes]);

  const saveMutation = useMutation({
    mutationFn: (payload) => financeApi.saveBillingRun(payload),
    onSuccess: (res) => {
      toast.success('Billing run saved');
      queryClient.invalidateQueries({ queryKey: ['finance', 'billing-history'] });
      const id = res?.run?.id;
      navigate(id ? `/finance/billing/${id}` : '/finance');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save billing run'),
  });

  const { billed: billedLines, excluded: excludedLines, unmatched: unmatchedLines, noActivity: noActivityLines } =
    useMemo(() => partitionBillingLines(lines), [lines]);
  const billedTotal = useMemo(() => totalOfLines(billedLines), [billedLines]);
  const excludedTotal = useMemo(() => totalOfLines(excludedLines), [excludedLines]);
  const unmatchedTotal = useMemo(() => totalOfLines(unmatchedLines), [unmatchedLines]);
  const grandTotal = billedTotal + excludedTotal + unmatchedTotal;
  const unmatchedCount = unmatchedLines.length;
  const excludedCount = excludedLines.length;
  const noActivityCount = noActivityLines.length;
  const confirmedNoActivityCount = useMemo(
    () => noActivityLines.filter((line) => confirmedCodes.has(confirmKey(line))).length,
    [noActivityLines, confirmedCodes]
  );

  const toggleNoActivityConfirm = (line) => {
    const key = confirmKey(line);
    if (!key) return;
    setConfirmedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const visibleRows = useMemo(() => {
    return lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => {
        if (lineFilter === 'billed') return !line.excluded && !line.unmatched && !isNoActivityLine(line);
        if (lineFilter === 'excluded') return Boolean(line.excluded);
        if (lineFilter === 'unmatched') return Boolean(line.unmatched) && !line.excluded;
        if (lineFilter === 'noActivity') return isNoActivityLine(line);
        return true;
      });
  }, [lines, lineFilter]);

  const handleLineFilter = (next) => {
    setLineFilter((prev) => (prev === next ? 'all' : next));
  };
  const contractCodes = useMemo(
    () =>
      [...new Set(
        lines
          .filter((line) => !line.unmatched && !line.excluded && String(line.clientCode || '').trim())
          .map((line) => String(line.clientCode).trim())
      )],
    [lines]
  );

  const handleMergeUnmatched = (sourceIndex, targetCode) => {
    const result = mergeUnmatchedIntoCode(lines, sourceIndex, targetCode);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setLines(result.lines);
    toast.success(`Merged into ${result.targetCode}`);
    return true;
  };

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const classified = [];
    for (const file of incoming) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.csv')) {
        classified.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          engine: detectEngine(file.name),
          payload: await fileToPayload(file),
        });
        continue;
      }
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const parsed = await readContractFile(file);
        if (!parsed) {
          toast.error(`${file.name} needs Code and Category columns to be a contract report`);
          continue;
        }
        classified.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          engine: 'contract',
          contractRows: parsed.rows,
          payload: await fileToPayload(file),
        });
        continue;
      }
      toast.error(`${file.name}: use billing .csv files or a contract .xlsx`);
    }

    if (classified.length === 0) return;

    setItems((prev) => {
      const existing = new Set(prev.map((p) => p.file.name));
      let next = [...prev];
      for (const item of classified) {
        if (item.engine === 'contract') {
          next = next.filter((p) => p.engine !== 'contract');
        } else if (existing.has(item.file.name)) {
          continue;
        }
        existing.add(item.file.name);
        next.push(item);
      }
      return next;
    });
  };

  const handleProcess = async () => {
    if (!canProcess) {
      toast.error('You cannot process billing files');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one file');
      return;
    }
    if (!effectiveBranch) {
      toast.error('Select a branch before processing');
      return;
    }
    const csvItems = items.filter((item) => item.engine !== 'contract');
    const contractItems = items.filter((item) => item.engine === 'contract');
    if (csvItems.length === 0 && contractItems.length === 0) {
      toast.error('Add billing CSVs or a contract workbook');
      return;
    }

    setProcessing(true);
    try {
      const [lookupRes, exclusionRes] = await Promise.all([
        financeApi.getLookup(effectiveBranch),
        financeApi.getExclusions(effectiveBranch),
      ]);
      queryClient.setQueryData(['finance', 'lookup', effectiveBranch], lookupRes);
      queryClient.setQueryData(['finance', 'exclusions', effectiveBranch], exclusionRes);
      const priorLookup = lookupRes?.lookup || {};
      const files = await Promise.all(
        csvItems.map(async (item) => ({
          name: item.file.name,
          engine: item.engine,
          text: await readFileText(item.file),
        }))
      );
      const result = processBillingFiles(files, {
        lookup: priorLookup,
        exclusions: {
          categories: exclusionRes?.categories || [],
          codes: exclusionRes?.codes || [],
        },
      });
      const notes = [...result.warnings];
      let output = result.lines;
      const newLookupNames = Object.keys(result.lookup || {}).filter((name) => {
        const want = name.trim().toLowerCase();
        return !Object.keys(priorLookup).some((k) => k.trim().toLowerCase() === want);
      });
      if (newLookupNames.length && can('finance.lookup.manage') && effectiveBranch) {
        const merged = { ...priorLookup };
        newLookupNames.forEach((name) => {
          merged[name] = result.lookup[name] || '';
        });
        try {
          await financeApi.saveLookup(effectiveBranch, merged);
          await queryClient.invalidateQueries({ queryKey: ['finance', 'lookup', effectiveBranch] });
        } catch {
          notes.push('Could not save new lookup names — add them on the Client Lookup page');
        }
      }

      if (contractItems.length > 0) {
        if (contractItems.length > 1) {
          notes.push('Multiple contract files found; using the last one');
        }
        const contractItem = contractItems[contractItems.length - 1];
        let parsedRows = Array.isArray(contractItem.contractRows) ? contractItem.contractRows : null;
        if (!parsedRows) {
          const parsed = await readContractFile(contractItem.file);
          parsedRows = parsed?.rows ?? null;
        }
        if (!parsedRows) {
          toast.error('Contract workbook has no Code and Category header row');
        } else {
          output = mergeWithContracts(output, parsedRows, notes, {
            categories: exclusionRes?.categories || [],
            codes: exclusionRes?.codes || [],
          }, priorLookup);
          logSplitTotals(output, 'after contract matching');
        }
      } else {
        logSplitTotals(output, 'no contract file — split of engine merge');
      }

      setLines(output);
      setWarnings(notes);
      if (output.length === 0) {
        toast.error('No rows after processing');
      } else {
        toast.success(`${output.length} row(s) ready`);
      }
    } catch (err) {
      toast.error(err?.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFiles = () => {
    skipPersist.current = true;
    clearBillingImportSession(effectiveBranch);
    setItems([]);
    setLines([]);
    setWarnings([]);
    setConfirmedCodes(new Set());
    window.setTimeout(() => {
      skipPersist.current = false;
    }, 0);
  };

  const handleUpdateUnmatchedCode = async (line, nextCode) => {
    const code = String(nextCode || '').trim();
    const name = String(line.customerName || '').trim();
    if (!code) {
      toast.error('Enter a Smart Edge code');
      return;
    }
    if (!name) {
      toast.error('This row has no customer name to save in Client Lookup');
      return;
    }
    if (!can('finance.lookup.manage')) {
      toast.error('You cannot update Client Lookup');
      return;
    }
    if (!effectiveBranch) {
      toast.error('Select a branch first');
      return;
    }
    try {
      const current = await financeApi.getLookup(effectiveBranch);
      const lookup = current?.lookup || {};
      const existingKey =
        Object.keys(lookup).find((key) => key.trim().toLowerCase() === name.toLowerCase()) || name;
      await financeApi.saveLookup(effectiveBranch, { [existingKey]: code });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'lookup', effectiveBranch] });
      toast.success(`Saved ${existingKey} → ${code}`);
      await handleProcess();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save lookup code');
    }
  };

  const handleSave = () => {
    if (!canSave) {
      toast.error('You cannot save billing runs');
      return;
    }
    if (!effectiveBranch) {
      toast.error('Select a branch first');
      return;
    }
    if (!period) {
      toast.error('Choose a billing period');
      return;
    }
    if (billedLines.length === 0 && excludedLines.length === 0 && unmatchedLines.length === 0 && noActivityLines.length === 0) {
      toast.error('Process files before saving');
      return;
    }
    saveMutation.mutate({
      branch: effectiveBranch,
      period,
      lines: [
        ...billedLines.map(toBillingSaveLine),
        ...noActivityLines.map((line) =>
          toBillingSaveLine(line, { confirmed: confirmedCodes.has(confirmKey(line)) })
        ),
      ],
      excludedLines: excludedLines.map(toBillingSaveLine),
      unmatchedLines: unmatchedLines.map(toBillingSaveLine),
    });
  };

  const exportStamp = period || 'period';
  const handleExport = (kind, rows) => {
    if (!rows.length) {
      toast.error(`No ${kind} lines to export`);
      return;
    }
    downloadBillingCsv(
      `${kind}-${effectiveBranch || 'branch'}-${exportStamp}.csv`,
      billingLinesToCsv(rows)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Import</h1>
          <p className="text-gray-500 mt-1">
            Drop Albatross, Porta, and VCE CSVs plus the Smart Edge contract XLSX, then save
          </p>
        </div>
        <Link to="/finance" className="text-sm text-red-600 hover:underline">
          Back to Finance
        </Link>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={clsx(
          'tile-card p-8 text-center border-2 border-dashed transition-colors',
          dragging ? 'border-red-500 bg-red-50/50' : 'border-gray-300'
        )}
      >
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-700 font-medium">Drag and drop CSV and contract XLSX files here</p>
        <p className="text-sm text-gray-500 mt-1">
          Billing CSVs (albatross / porta / CostRevenue) and a Smart Edge contract report (Code + Category)
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Choose files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="tile-card divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                <span
                  className={clsx(
                    'inline-flex mt-1 text-xs px-2 py-0.5 rounded-full',
                    ENGINE_BADGE[item.engine] || 'bg-gray-100 text-gray-600'
                  )}
                >
                  {engineLabel(item.engine)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItems((prev) => prev.filter((p) => p.id !== item.id));
                  setLines([]);
                  setWarnings([]);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600"
                aria-label={`Remove ${item.file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label htmlFor="billing-period" className="block text-sm font-medium text-gray-700 mb-1">
            Period
          </label>
          <input
            id="billing-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleProcess}
          disabled={processing || items.length === 0 || !canProcess}
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Process
        </button>
        <button
          type="button"
          onClick={handleProcess}
          disabled={processing || items.length === 0 || !canProcess}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={clsx('h-4 w-4 mr-2', processing && 'animate-spin')} />
          Reprocess
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || lines.length === 0 || saveMutation.isPending}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Run
        </button>
        {items.length > 0 || lines.length > 0 ? (
          <button
            type="button"
            onClick={handleClearFiles}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Clear files
          </button>
        ) : null}
      </div>

      {warnings.length > 0 && (
        <div className="tile-card p-4 text-sm text-amber-800 bg-amber-50">
          <p className="font-medium mb-2">Processing notes ({warnings.length})</p>
          <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
            {warnings.slice(0, 30).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {warnings.length > 30 ? <li>…and {warnings.length - 30} more</li> : null}
          </ul>
        </div>
      )}

      {lines.length > 0 ? (
        <BillingRunTotals
          billed={billedTotal}
          excluded={excludedTotal}
          unmatched={unmatchedTotal}
          grand={grandTotal}
          noActivity={0}
          noActivityCount={noActivityCount}
          activeFilter={lineFilter}
          onFilterChange={handleLineFilter}
        />
      ) : null}

      <div className="tile-card overflow-x-auto">
        {lines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Processed client rows will appear here</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600">
              Showing {visibleRows.length} of {lines.length} rows · {billedLines.length} billed · {excludedCount}{' '}
              excluded · {unmatchedCount} unmatched · {noActivityCount} no activity
              {noActivityCount > 0
                ? ` · ${confirmedNoActivityCount} of ${noActivityCount} no-activity lines confirmed`
                : ''}
            </div>
            <datalist id="billing-contract-codes">
              {contractCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            {visibleRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No rows in this view</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {TABLE_HEADERS.map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleRows.map(({ line, index }) => (
                    <tr
                      key={`${line.clientCode}-${line.customerName}-${index}`}
                      className={clsx(
                        line.excluded && 'bg-gray-100 text-gray-400',
                        line.unmatched && 'bg-orange-50',
                        isNoActivityLine(line) &&
                          (confirmedCodes.has(confirmKey(line)) ? 'bg-emerald-50' : 'bg-sky-50')
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                        {line.unmatched && !line.excluded ? (
                          <UnmatchedCodeEditor
                            key={`${line.customerName}-${line.clientCode}`}
                            initialCode={line.clientCode}
                            disabled={processing}
                            busy={processing}
                            onUpdate={(code) => handleUpdateUnmatchedCode(line, code)}
                          />
                        ) : (
                          line.clientCode || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {line.customerName}
                        {line.unmatched ? (
                          <span className="ml-2 text-xs text-orange-700">Not on contract</span>
                        ) : null}
                        {line.unmatched && !line.excluded ? (
                          <UnmatchedMergeControl
                            codeListId="billing-contract-codes"
                            onMerge={(code) => handleMergeUnmatched(index, code)}
                          />
                        ) : null}
                        {line.excluded ? (
                          <span className="ml-2 text-xs text-gray-500">Excluded</span>
                        ) : null}
                        {isNoActivityLine(line) ? (
                          <>
                            <span className="ml-2 text-xs text-sky-700">No activity</span>
                            <NoActivityConfirmControl
                              confirmed={confirmedCodes.has(confirmKey(line))}
                              onToggle={() => toggleNoActivityConfirm(line)}
                            />
                          </>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{line.category || '—'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.mobile)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.international)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.national)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.local)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.special)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.virtual)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatZar(line.vce)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {lines.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleExport('smart-edge', smartEdgeExportLines({ billed: billedLines, noActivity: noActivityLines }))}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Smart Edge CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('excluded', excludedLines)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excluded CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('unmatched', unmatchedLines)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Unmatched CSV
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
