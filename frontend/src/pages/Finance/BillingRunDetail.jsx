import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/dateFormat';
import { formatZar } from './formatZar';
import { groupRunLines, smartEdgeExportLines, totalOfLines } from './billingLineSets';
import { billingLinesToCsv, downloadBillingCsv } from './billingCsv';
import BillingRunTotals from './BillingRunTotals';
import BillingRunLinesTable from './BillingRunLinesTable';

const TABS = [
  { id: 'billed', label: 'Billed' },
  { id: 'excluded', label: 'Excluded' },
  { id: 'unmatched', label: 'Unmatched' },
  { id: 'noActivity', label: 'No activity' },
];

export default function BillingRunDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const canView = can('finance.billing.view');
  const [tab, setTab] = useState('billed');

  const { data: run, isLoading, error } = useQuery({
    queryKey: ['finance', 'billing-run', id],
    queryFn: () => financeApi.getBillingRun(id),
    enabled: canView && Boolean(id),
  });

  const grouped = useMemo(() => groupRunLines(run?.lines ?? []), [run?.lines]);
  const billedTotal = totalOfLines(grouped.billed);
  const excludedTotal = totalOfLines(grouped.excluded);
  const unmatchedTotal = totalOfLines(grouped.unmatched);
  const noActivityCount = grouped.noActivity.length;
  const confirmedIdle = grouped.noActivity.filter((line) => line.confirmed).length;
  const smartEdgeLines = smartEdgeExportLines(grouped);

  const exportRunCsv = (kind, rows) => {
    if (!rows.length) {
      toast.error(`No ${kind} lines to export`);
      return;
    }
    downloadBillingCsv(
      `${kind}-${run?.branch || 'branch'}-${run?.period || 'period'}.csv`,
      billingLinesToCsv(rows)
    );
  };

  if (!canView) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to Finance.
      </div>
    );
  }

  if (isLoading) {
    return <div className="tile-card p-8 text-center text-gray-400">Loading...</div>;
  }

  if (error || !run) {
    return (
      <div className="tile-card p-8 text-center text-red-600">
        {error?.response?.data?.error || 'Billing run not found'}
        <div className="mt-4">
          <Link to="/finance" className="text-sm text-red-600 hover:underline">
            Back to Finance
          </Link>
        </div>
      </div>
    );
  }

  const activeLines = grouped[tab] || [];
  const emptyLabels = {
    billed: 'No billed lines on this run',
    excluded: 'No excluded lines on this run',
    unmatched: 'No unmatched lines on this run',
    noActivity: 'No zero-activity contract lines on this run',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Billing run {run.period}</h1>
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium',
                run.status === 'draft'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-900'
              )}
            >
              {run.status === 'draft' ? 'Draft' : 'Submitted'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {run.processedBy} · {formatDateTime(run.createdAt)} · {run.clientCount} billed clients
          </p>
          {run.notes ? <p className="text-sm text-gray-600 mt-2">{run.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {run.status === 'draft' ? (
            <Link
              to={`/finance/billing?draftId=${encodeURIComponent(run.id)}`}
              className="inline-flex items-center px-4 py-2 border border-amber-400 rounded-lg text-sm text-amber-900 hover:bg-amber-50"
            >
              Resume draft
            </Link>
          ) : null}
          <Link to="/finance" className="text-sm text-red-600 hover:underline self-center">
            Back to Finance
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="tile-card p-4">
          <p className="text-sm text-gray-500">Branch</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{run.branch}</p>
        </div>
      </div>

      <BillingRunTotals
        billed={billedTotal}
        excluded={excludedTotal}
        unmatched={unmatchedTotal}
        noActivityCount={noActivityCount}
      />
      {noActivityCount > 0 ? (
        <p className="text-sm text-gray-600">
          {confirmedIdle} of {noActivityCount} no-activity lines confirmed
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => exportRunCsv('smart-edge', smartEdgeLines)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Smart Edge CSV
        </button>
        <button
          type="button"
          onClick={() => exportRunCsv('excluded', grouped.excluded)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Excluded CSV
        </button>
        <button
          type="button"
          onClick={() => exportRunCsv('unmatched', grouped.unmatched)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Unmatched CSV
        </button>
      </div>

      <div className="tile-card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px',
                tab === item.id
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {item.label} ({grouped[item.id].length}) · {formatZar(totalOfLines(grouped[item.id]))}
            </button>
          ))}
        </div>
        <BillingRunLinesTable
          lines={activeLines}
          emptyLabel={emptyLabels[tab]}
          showConfirmed={tab === 'noActivity'}
        />
      </div>
    </div>
  );
}
