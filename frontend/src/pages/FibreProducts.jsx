import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fibreProductsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import { trimLeading } from '../utils/string';

const emptyForm = {
  name: '',
  productType: 'FTTH',
  defaultEtaWeeks: 2,
  notes: '',
};

export default function FibreProducts() {
  const queryClient = useQueryClient();
  const { hasModule, isElevated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['fibre-products', 'all'],
    queryFn: () => fibreProductsApi.list(true),
    enabled: hasModule(MODULE_FIBRE_ORDERS) && isElevated,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? fibreProductsApi.update(editing.id, payload) : fibreProductsApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries(['fibre-products']);
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Save failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => fibreProductsApi.deactivate(id),
    onSuccess: () => {
      toast.success('Product deactivated');
      queryClient.invalidateQueries(['fibre-products']);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Deactivate failed'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      productType: product.productType,
      defaultEtaWeeks: product.defaultEtaWeeks,
      notes: product.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  if (!hasModule(MODULE_FIBRE_ORDERS)) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have access to the Fibre Orders module.
      </div>
    );
  }

  if (!isElevated) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        Administrator or manager access is required to manage products.
      </div>
    );
  }

  const products = data?.products ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fibre Products</h1>
            <p className="text-gray-500">Manage product catalogue and default ETAs</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="tile-card overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA (weeks)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className={!p.isActive ? 'opacity-60' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.productType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.defaultEtaWeeks}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-gray-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {p.isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deactivate ${p.name}?`)) deactivateMutation.mutate(p.id);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-600 ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button type="button" onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({
                  ...form,
                  defaultEtaWeeks: Number(form.defaultEtaWeeks),
                  notes: form.notes || null,
                });
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: trimLeading(e.target.value) }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
                <input
                  type="text"
                  value={form.productType}
                  onChange={(e) => setForm((f) => ({ ...f, productType: trimLeading(e.target.value) }))}
                  required
                  placeholder="FTTH, FTTB, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default ETA (weeks) *</label>
                <input
                  type="number"
                  min={1}
                  value={form.defaultEtaWeeks}
                  onChange={(e) => setForm((f) => ({ ...f, defaultEtaWeeks: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
