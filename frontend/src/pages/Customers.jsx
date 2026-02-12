import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  Printer,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Archive,
  RotateCcw,
} from 'lucide-react';

const Customers = ({ title = 'Customers' }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch, isAdmin, isMeterUser } = useAuth();
  const canArchive = isAdmin || isMeterUser;
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', effectiveBranch],
    queryFn: () => customersApi.getAll(effectiveBranch),
  });

  const { data: tonerAlertsData } = useQuery({
    queryKey: ['toner-alerts', effectiveBranch],
    queryFn: () => consumablesApi.getTonerAlerts(effectiveBranch),
  });

  const tonerAlertsByCustomer = (tonerAlertsData?.customerAlerts || []).reduce((acc, a) => {
    acc[a.customerId] = a;
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: (id) => customersApi.delete(id),
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete customer');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }) => customersApi.archive(id, isArchived),
    onSuccess: (_, { isArchived }) => {
      toast.success(isArchived ? 'Customer archived' : 'Customer unarchived');
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update customer');
    },
  });

  const customers = data?.customers || [];

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleArchive = (customer) => {
    const willArchive = !customer.isArchived;
    archiveMutation.mutate({ id: customer.id, isArchived: willArchive });
  };

  const handleDelete = (customer) => {
    const machineCount = customer._count?.machines ?? 0;
    if (machineCount > 0) {
      toast.error(`Cannot delete: ${machineCount} machine(s) are linked to this customer. Unlink them first.`);
      return;
    }
    if (window.confirm(`Delete customer "${customer.name}"?`)) {
      deleteMutation.mutate(customer.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">Select a customer to view machines and record consumable orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/consumables/summary"
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Summary
          </Link>
          {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`rounded-lg shadow-sm p-4 border transition-colors relative group ${
              customer.isArchived
                ? 'bg-gray-50 border-gray-200 opacity-75'
                : 'bg-white border-gray-200 hover:border-red-200'
            }`}
          >
            <Link
              to={`/customers/${customer.id}`}
              className="block"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 group-hover:text-red-600 truncate">{customer.name}</p>
                      {customer.isArchived && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Archived
                        </span>
                      )}
                      {tonerAlertsByCustomer[customer.id] && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0"
                          title={tonerAlertsByCustomer[customer.id].partsDue
                            .map((p) => `${p.partName} (${p.machineSerialNumber}): ${p.usage.toLocaleString()} / ${p.expectedYield.toLocaleString()} clicks (${p.percentUsed}% of yield)`)
                            .join('\n')}
                        >
                          <span className="flex items-center gap-0.5">
                            {tonerAlertsByCustomer[customer.id].partsDue.map((p, i) => (
                              <span
                                key={i}
                                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                                style={{
                                  backgroundColor:
                                    p.tonerColor === 'black'
                                      ? '#1f2937'
                                      : p.tonerColor === 'cyan'
                                        ? '#06b6d4'
                                        : p.tonerColor === 'magenta'
                                          ? '#ec4899'
                                          : p.tonerColor === 'yellow'
                                            ? '#eab308'
                                            : '#6b7280',
                                }}
                                title={p.partName}
                              />
                            ))}
                          </span>
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          {tonerAlertsByCustomer[customer.id].alertCount === 1
                            ? 'Toner due'
                            : `${tonerAlertsByCustomer[customer.id].alertCount} toners due`}
                        </span>
                      )}
                    </div>
                    {customer.contactName && (
                      <p className="text-sm text-gray-500 truncate">{customer.contactName}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-600 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 pt-3 border-t space-y-2">
                {customer.email && (
                  <p className="text-sm text-gray-600 truncate">{customer.email}</p>
                )}
                {customer.phone && (
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Printer className="h-3.5 w-3" />
                    {customer._count?.machines ?? 0} machine(s)
                  </span>
                  {customer.branch && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {customer.branch}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {(isAdmin || canArchive) && (
              <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.preventDefault()}>
                {isAdmin && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(customer); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canArchive && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchive(customer); }}
                    disabled={archiveMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                    title={customer.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    {customer.isArchived ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(customer); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

const CustomerModal = ({ customer, onClose }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const isEditing = !!customer;

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    contactName: customer?.contactName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    branch: customer?.branch || '',
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (payload.branch === '') payload.branch = null;
      return isEditing
        ? customersApi.update(customer.id, payload)
        : customersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Customer updated' : 'Customer created');
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['machines']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Operation failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">No branch</option>
              <option value="JHB">Johannesburg (JHB)</option>
              <option value="CT">Cape Town (CT)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4 mr-2" />
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;
