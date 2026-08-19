import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { trimLeading } from '../../utils/string';

export default function FinanceExclusions() {
  const queryClient = useQueryClient();
  const { can, effectiveBranch } = useAuth();
  const canView = can('finance.exclusions.view') || can('finance.billing.view');
  const canManage = can('finance.exclusions.manage');
  const [categories, setCategories] = useState(['']);
  const [codes, setCodes] = useState([{ value: '', note: '' }]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance', 'exclusions', effectiveBranch],
    queryFn: () => financeApi.getExclusions(effectiveBranch),
    enabled: canView && Boolean(effectiveBranch),
  });

  useEffect(() => {
    if (!data) return;
    setCategories(data.categories?.length ? [...data.categories] : ['']);
    setCodes(
      data.codes?.length
        ? data.codes.map((c) => ({ value: c.value || '', note: c.note || '' }))
        : [{ value: '', note: '' }]
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      financeApi.saveExclusions(effectiveBranch, {
        categories: categories.map((c) => c.trim()).filter(Boolean),
        codes: codes
          .map((c) => ({ value: c.value.trim(), note: c.note.trim() }))
          .filter((c) => c.value),
      }),
    onSuccess: () => {
      toast.success('Exclusions saved');
      queryClient.invalidateQueries({ queryKey: ['finance', 'exclusions', effectiveBranch] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save exclusions'),
  });

  if (!canView) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to finance exclusions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exclusions</h1>
          <p className="text-gray-500 mt-1">Categories and client codes omitted from billing import</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save exclusions'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="tile-card p-8 text-center text-gray-400">Loading...</div>
      ) : error ? (
        <div className="tile-card p-8 text-center text-red-600">
          {error.response?.data?.error || 'Failed to load exclusions'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="tile-card p-4 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            {categories.map((value, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={value}
                  onChange={(e) =>
                    setCategories((prev) => prev.map((v, i) => (i === index ? trimLeading(e.target.value) : v)))
                  }
                  disabled={!canManage}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                  placeholder="e.g. Data"
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={() =>
                      setCategories((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)))
                    }
                    className="p-2 text-gray-500 hover:text-red-600"
                    aria-label="Remove category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {canManage && (
              <button
                type="button"
                onClick={() => setCategories((prev) => [...prev, ''])}
                className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add category
              </button>
            )}
          </div>

          <div className="tile-card p-4 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Codes</h2>
            {codes.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.value}
                  onChange={(e) =>
                    setCodes((prev) =>
                      prev.map((c, i) => (i === index ? { ...c, value: trimLeading(e.target.value) } : c))
                    )
                  }
                  disabled={!canManage}
                  className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                  placeholder="ACC0101"
                />
                <input
                  value={row.note}
                  onChange={(e) =>
                    setCodes((prev) =>
                      prev.map((c, i) => (i === index ? { ...c, note: trimLeading(e.target.value) } : c))
                    )
                  }
                  disabled={!canManage}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                  placeholder="Note (optional)"
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={() =>
                      setCodes((prev) =>
                        prev.length === 1 ? [{ value: '', note: '' }] : prev.filter((_, i) => i !== index)
                      )
                    }
                    className="p-2 text-gray-500 hover:text-red-600"
                    aria-label="Remove code"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {canManage && (
              <button
                type="button"
                onClick={() => setCodes((prev) => [...prev, { value: '', note: '' }])}
                className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add code
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
