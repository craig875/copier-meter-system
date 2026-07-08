import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fibreOrdersApi, fibreProductsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MODULE_FIBRE_ORDERS } from '../constants/modules';
import { trimLeading } from '../utils/string';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function FibreOrderForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { hasModule, isElevated, effectiveBranch } = useAuth();

  const [form, setForm] = useState({
    branch: effectiveBranch || 'JHB',
    customerName: '',
    customerReference: '',
    installationAddress: '',
    productId: '',
    salesAgentId: '',
    orderPlacementDate: todayISO(),
    notes: '',
  });

  const { data: productsData } = useQuery({
    queryKey: ['fibre-products'],
    queryFn: () => fibreProductsApi.list(false),
    enabled: hasModule(MODULE_FIBRE_ORDERS) && isElevated,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: hasModule(MODULE_FIBRE_ORDERS) && isElevated,
  });

  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ['fibre-orders', id],
    queryFn: () => fibreOrdersApi.get(id),
    enabled: isEditing && hasModule(MODULE_FIBRE_ORDERS),
  });

  useEffect(() => {
    if (orderData?.order) {
      const o = orderData.order;
      setForm({
        branch: o.branch,
        customerName: o.customerName,
        customerReference: o.customerReference || '',
        installationAddress: o.installationAddress,
        productId: o.productId,
        salesAgentId: o.salesAgentId,
        orderPlacementDate: o.orderPlacementDate?.slice?.(0, 10) ?? todayISO(),
        notes: o.notes || '',
      });
    }
  }, [orderData]);

  useEffect(() => {
    if (effectiveBranch && !isEditing) {
      setForm((prev) => ({ ...prev, branch: effectiveBranch }));
    }
  }, [effectiveBranch, isEditing]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditing ? fibreOrdersApi.update(id, payload) : fibreOrdersApi.create(payload),
    onSuccess: (result) => {
      toast.success(isEditing ? 'Order updated' : 'Order created');
      navigate(`/fibre-orders/${result.order.id}`);
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

  if (!hasModule(MODULE_FIBRE_ORDERS) || !isElevated) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        You do not have permission to manage fibre orders.
      </div>
    );
  }

  if (isEditing && orderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const products = productsData?.products ?? [];
  const salesAgents = (usersData?.users ?? []).filter(
    (u) => u.role === 'sales_agent' || u.role === 'admin' || u.role === 'manager'
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: typeof value === 'string' ? trimLeading(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.productId || !form.salesAgentId) {
      toast.error('Product and sales agent are required');
      return;
    }
    mutation.mutate({
      ...form,
      customerReference: form.customerReference || null,
      notes: form.notes || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={isEditing ? `/fibre-orders/${id}` : '/fibre-orders'} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Fibre Order' : 'New Fibre Order'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="tile-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
            <select
              name="branch"
              value={form.branch}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="JHB">Johannesburg (JHB)</option>
              <option value="CT">Cape Town (CT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Placement Date *</label>
            <input
              type="date"
              name="orderPlacementDate"
              value={form.orderPlacementDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Reference</label>
          <input
            type="text"
            name="customerReference"
            value={form.customerReference}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Installation Address *</label>
          <textarea
            name="installationAddress"
            value={form.installationAddress}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select
              name="productId"
              value={form.productId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.defaultEtaWeeks}w ETA)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Agent *</label>
            <select
              name="salesAgentId"
              value={form.salesAgentId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select agent...</option>
              {salesAgents.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Order'}
          </button>
          <Link
            to={isEditing ? `/fibre-orders/${id}` : '/fibre-orders'}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
