import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Check, X, Search } from 'lucide-react';

const PartsPricing = () => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [branchFilter, setBranchFilter] = useState(effectiveBranch || '');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editCost, setEditCost] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['model-parts-all', branchFilter || null],
    queryFn: () => consumablesApi.getModelPartsAll(branchFilter || null),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, costRand }) => consumablesApi.updateModelPart(id, { costRand }),
    onSuccess: () => {
      toast.success('Cost updated');
      setEditingId(null);
      setEditCost('');
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update');
    },
  });

  const allParts = data?.parts || [];
  const searchLower = search.trim().toLowerCase();
  const parts = searchLower
    ? allParts.filter((p) => {
        const make = (p.model?.make?.name || '').toLowerCase();
        const model = (p.model?.name || '').toLowerCase();
        const partName = (p.partName || '').toLowerCase();
        const itemCode = (p.itemCode || '').toLowerCase();
        return (
          make.includes(searchLower) ||
          model.includes(searchLower) ||
          partName.includes(searchLower) ||
          itemCode.includes(searchLower)
        );
      })
    : allParts;

  const handleStartEdit = (part) => {
    setEditingId(part.id);
    setEditCost(Number(part.costRand || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCost('');
  };

  const handleSaveCost = () => {
    const cost = parseFloat(editCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Enter a valid cost (0 or greater)');
      return;
    }
    updateMutation.mutate({ id: editingId, costRand: cost });
  };

  const modelDisplay = (part) => {
    const make = part.model?.make?.name || '';
    const model = part.model?.name || '';
    return `${make} ${model}`.trim() || '—';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts & Pricing</h1>
          <p className="text-gray-500">
            Update part costs without going through Machine Configuration
            <span className="ml-2 text-gray-400 font-medium">
              · {parts.length} of {allParts.length} part{allParts.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Part name, item code, make, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-64"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All branches</option>
              <option value="JHB">JHB</option>
              <option value="CT">CT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="liquid-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Make · Model</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Part</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Item code</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Expected yield</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Cost (R)</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    {allParts.length === 0
                      ? 'No parts found. Add parts via Admin Tools → Machine Configuration.'
                      : 'No parts match your search.'}
                  </td>
                </tr>
              ) : (
                parts.map((part) => (
                  <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-700">{modelDisplay(part)}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{part.partName}</span>
                      {part.tonerColor && (
                        <span className="ml-1.5 text-xs text-gray-500">({part.tonerColor})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{part.itemCode || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {part.partType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {part.expectedYield?.toLocaleString() ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingId === part.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCost();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={handleSaveCost}
                            disabled={updateMutation.isPending}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          R{Number(part.costRand || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {editingId === part.id ? null : (
                        <button
                          onClick={() => handleStartEdit(part)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Edit cost"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartsPricing;
