import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { installationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';

function emptyToNull(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export default function InstallationForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { can, effectiveBranch } = useAuth();
  const canManageForm = isEditing
    ? can('installations.update')
    : can('installations.create');

  const [form, setForm] = useState({
    typeName: '',
    customerName: '',
    siteName: '',
    area: '',
    siteAddress: '',
    salesOrderNumber: '',
    progress: '',
  });

  const { data: installData, isLoading: installLoading } = useQuery({
    queryKey: ['installations', id],
    queryFn: () => installationsApi.get(id),
    enabled: isEditing && canManageForm,
  });

  useEffect(() => {
    if (!installData?.install) return;
    const i = installData.install;
    setForm({
      typeName: i.typeName || i.type?.name || '',
      customerName: i.customerName || '',
      siteName: i.siteName || '',
      area: i.area || '',
      siteAddress: i.siteAddress || '',
      salesOrderNumber: i.salesOrderNumber || '',
      progress: i.progress || '',
    });
  }, [installData]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditing ? installationsApi.update(id, payload) : installationsApi.create(payload),
    onSuccess: (result) => {
      toast.success(isEditing ? 'Installation updated' : 'Installation created');
      const passFrom = location.state?.from;
      navigate(`/installations/${result.install.id}`, {
        state: passFrom ? { from: passFrom } : undefined,
      });
    },
    onError: (err) => {
      const details = err?.response?.data?.details;
      if (details?.length) {
        toast.error(details.map((d) => d.message).join(', '));
      } else {
        toast.error(err?.response?.data?.error || 'Save failed');
      }
    },
  });

  if (!canManageForm) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have permission to manage installations.
      </div>
    );
  }

  if (isEditing && installLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: typeof value === 'string' ? trimLeading(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.typeName.trim()) {
      toast.error('Type is required');
      return;
    }
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const payload = {
      typeName: form.typeName.trim(),
      customerName: form.customerName.trim(),
      siteName: emptyToNull(form.siteName),
      area: emptyToNull(form.area),
      siteAddress: emptyToNull(form.siteAddress),
      salesOrderNumber: emptyToNull(form.salesOrderNumber),
      progress: emptyToNull(form.progress),
    };

    if (!isEditing && effectiveBranch) {
      payload.branch = effectiveBranch;
    }

    mutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isEditing ? 'Edit Installation' : 'New Installation'}
      </h1>

      <form onSubmit={handleSubmit} className="tile-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input
            type="text"
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
          <input
            type="text"
            name="siteName"
            value={form.siteName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
          <input
            type="text"
            name="area"
            value={form.area}
            onChange={handleChange}
            maxLength={120}
            placeholder="Suburb / region"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
          <textarea
            name="siteAddress"
            value={form.siteAddress}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <input
            type="text"
            name="typeName"
            value={form.typeName}
            onChange={handleChange}
            required
            maxLength={120}
            placeholder="e.g. Copier / Fibre equipment"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order Number</label>
          <input
            type="text"
            name="salesOrderNumber"
            value={form.salesOrderNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isEditing ? 'Progress' : 'Initial Progress Note'}
          </label>
          <textarea
            name="progress"
            value={form.progress}
            onChange={handleChange}
            rows={3}
            placeholder="e.g. Awaiting delivery / Site survey booked"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Installation'}
          </button>
        </div>
      </form>
    </div>
  );
}
