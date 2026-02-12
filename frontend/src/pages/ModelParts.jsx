import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consumablesApi, makesApi, modelsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

const ModelParts = () => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    makeId: '',
    modelId: '',
    partName: '',
    itemCode: '',
    partType: 'general',
    tonerColor: '',
    expectedYield: '',
    costRand: '',
    meterType: 'mono',
    branch: 'JHB',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['model-parts-all', effectiveBranch],
    queryFn: () => consumablesApi.getModelPartsAll(effectiveBranch),
  });

  const createMutation = useMutation({
    mutationFn: consumablesApi.createModelPart,
    onSuccess: () => {
      toast.success('Part added');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to add part'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => consumablesApi.updateModelPart(id, data),
    onSuccess: () => {
      toast.success('Part updated');
      setShowModal(false);
      setEditing(null);
      resetForm();
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: consumablesApi.deleteModelPart,
    onSuccess: () => {
      toast.success('Part deleted');
      queryClient.invalidateQueries(['model-parts-all']);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });

  const resetForm = () => {
    setForm({
      makeId: '',
      modelId: '',
      partName: '',
      itemCode: '',
      partType: 'general',
      tonerColor: '',
      expectedYield: '',
      costRand: '',
      meterType: 'mono',
      branch: effectiveBranch || 'JHB',
    });
  };

  const { data: makesData } = useQuery({ queryKey: ['makes'], queryFn: () => makesApi.getAll() });
  const { data: modelsData } = useQuery({
    queryKey: ['models', form.makeId],
    queryFn: () => modelsApi.getAll(form.makeId || null),
  });
  const makes = makesData?.makes || [];
  const models = modelsData?.models || [];

  const handleEdit = (part) => {
    setEditing(part);
    const mod = part.model || {};
    setForm({
      makeId: mod.make?.id || '',
      modelId: part.modelId || mod.id || '',
      partName: part.partName,
      itemCode: part.itemCode || '',
      partType: part.partType,
      tonerColor: part.tonerColor || '',
      expectedYield: String(part.expectedYield),
      costRand: String(Number(part.costRand) || ''),
      meterType: part.meterType || 'mono',
      branch: part.branch || 'JHB',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      modelId: form.modelId,
      partName: form.partName.trim(),
      itemCode: form.itemCode?.trim() || null,
      partType: form.partType,
      tonerColor: form.partType === 'toner' && form.tonerColor ? form.tonerColor : null,
      expectedYield: parseInt(form.expectedYield, 10),
      costRand: parseFloat(form.costRand) || 0,
      meterType: form.meterType,
      branch: form.branch,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const parts = data?.parts || [];

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
        <p className="text-red-600">{error?.response?.data?.error || error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Model parts</h2>
        <button
          onClick={() => {
            setEditing(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add part
        </button>
      </div>

      <div className="liquid-glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium">Make / Model</th>
              <th className="text-left py-3 px-4 font-medium">Part name</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-right py-3 px-4 font-medium">Yield</th>
              <th className="text-right py-3 px-4 font-medium">Cost (R)</th>
              <th className="text-left py-3 px-4 font-medium">Meter</th>
              <th className="text-left py-3 px-4 font-medium">Branch</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  {p.model ? `${p.model.make?.name || ''} ${p.model.name || ''}`.trim() : '-'}
                </td>
                <td className="py-3 px-4 font-medium">{p.partName}</td>
                <td className="py-3 px-4 capitalize">
                  {p.partType}{p.partType === 'toner' && p.tonerColor ? ` · ${p.tonerColor.charAt(0).toUpperCase() + p.tonerColor.slice(1)}` : ''}
                </td>
                <td className="py-3 px-4 text-right">{p.expectedYield?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right">R{Number(p.costRand || 0).toFixed(2)}</td>
                <td className="py-3 px-4 capitalize">{p.meterType || 'mono'}</td>
                <td className="py-3 px-4">{p.branch || '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 text-gray-600 hover:text-red-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${p.partName}?`)) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                      className="p-1.5 text-gray-600 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parts.length === 0 && (
          <p className="text-gray-500 py-8 text-center">No model parts defined. Add parts for each machine model.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="liquid-glass rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit part' : 'Add part'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <select
                  value={form.makeId}
                  onChange={(e) => setForm((f) => ({ ...f, makeId: e.target.value, modelId: '' }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select make...</option>
                  {makes.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={form.modelId}
                  onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))}
                  disabled={!form.makeId}
                  className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
                  required
                >
                  <option value="">Select model...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.make?.name} {m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Part name</label>
                <input
                  type="text"
                  value={form.partName}
                  onChange={(e) => setForm((f) => ({ ...f, partName: e.target.value }))}
                  placeholder="e.g. Black Toner"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Item code</label>
                <input
                  type="text"
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={form.partType}
                  onChange={(e) => setForm((f) => ({ ...f, partType: e.target.value, tonerColor: e.target.value === 'toner' ? f.tonerColor : '' }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="general">General</option>
                  <option value="toner">Toner</option>
                </select>
              </div>
              {form.partType === 'toner' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Colour</label>
                  <select
                    value={form.tonerColor}
                    onChange={(e) => setForm((f) => ({ ...f, tonerColor: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select colour...</option>
                    <option value="black">Black</option>
                    <option value="cyan">Cyan</option>
                    <option value="magenta">Magenta</option>
                    <option value="yellow">Yellow</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Expected yield (clicks)</label>
                <input
                  type="number"
                  min="1"
                  value={form.expectedYield}
                  onChange={(e) => setForm((f) => ({ ...f, expectedYield: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cost (Rand)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costRand}
                  onChange={(e) => setForm((f) => ({ ...f, costRand: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meter type</label>
                <select
                  value={form.meterType}
                  onChange={(e) => setForm((f) => ({ ...f, meterType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="mono">Mono</option>
                  <option value="colour">Colour</option>
                  <option value="total">Total (mono + colour)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="JHB">JHB</option>
                  <option value="CT">CT</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editing ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelParts;
