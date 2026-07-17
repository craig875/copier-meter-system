import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { installationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { buildFromState } from '../utils/navigationFrom';
import {
  INSTALL_STATUSES,
  INSTALL_STATUS_BADGE,
  installStatusLabel,
} from '../constants/installations';

export default function InstallationsList() {
  const location = useLocation();
  const { isElevated } = useAuth();
  const [statusTab, setStatusTab] = useState('active');
  const [search, setSearch] = useState('');

  const params = useMemo(() => {
    const p = { status: statusTab };
    if (search.trim()) p.search = search.trim();
    return p;
  }, [statusTab, search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['installations', 'list', params],
    queryFn: () => installationsApi.list(params),
    enabled: isElevated,
  });

  if (!isElevated) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to Installations.
      </div>
    );
  }

  const installs = data?.installs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installations</h1>
          <p className="text-gray-500 mt-1">
            {installs.length} {installStatusLabel(statusTab).toLowerCase()} installation(s)
          </p>
        </div>
        <Link
          to="/installations/new"
          state={buildFromState(location)}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Installation
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-px">
        {INSTALL_STATUSES.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusTab(tab.value)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              statusTab === tab.value
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customer, site, SO#, technician..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load installations.</div>
        ) : installs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No installations match your filters.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {installs.map((install) => (
                <tr key={install.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/installations/${install.id}`}
                      state={buildFromState(location)}
                      className="font-medium text-red-600 hover:text-red-700"
                    >
                      {install.customerName}
                    </Link>
                    {install.siteName && (
                      <p className="text-xs text-gray-500">{install.siteName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{install.type?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={install.progress || ''}>
                    {install.progress || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {install.salesOrderNumber ? (
                      install.salesOrderUrl ? (
                        <a
                          href={install.salesOrderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {install.salesOrderNumber}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-700">{install.salesOrderNumber}</span>
                      )
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {install.assignedTechnicianName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        INSTALL_STATUS_BADGE[install.status] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {installStatusLabel(install.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
