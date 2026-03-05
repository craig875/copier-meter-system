import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Archive,
  RotateCcw,
  MoreVertical,
} from 'lucide-react';

const Customers = ({ title = 'Customers' }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch, isAdmin, isMeterUser } = useAuth();
  const canArchive = isAdmin || isMeterUser;
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">
            Select a customer to view machines and record consumable orders
            <span className="ml-2 text-gray-400 font-medium">· {customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className={`tile-card p-4 relative group ${
              customer.isArchived ? '!bg-gray-50 opacity-75' : ''
            }`}
          >
            <Link
              to={`/customers/${customer.id}`}
              className="block flex"
            >
              {/* Left: status badges only (no icon) */}
              {(customer.isArchived || tonerAlertsByCustomer[customer.id]) && (
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 pr-4 border-r border-gray-200 gap-1">
                  {customer.isArchived && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                      Archived
                    </span>
                  )}
                  {tonerAlertsByCustomer[customer.id] && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                      title={tonerAlertsByCustomer[customer.id].partsDue
                        .map((p) => `${p.partName} (${p.machineSerialNumber}): ${p.usage.toLocaleString()} / ${p.expectedYield.toLocaleString()} clicks (${p.percentUsed}% of yield)`)
                        .join('\n')}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {tonerAlertsByCustomer[customer.id].alertCount}
                    </span>
                  )}
                </div>
              )}
              {/* Right: content - pr-10 reserves space for ellipsis button */}
              <div className={`flex-1 min-w-0 flex flex-col pr-10 ${(customer.isArchived || tonerAlertsByCustomer[customer.id]) ? 'pl-4' : ''}`}>
                <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                {customer.contactName && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{customer.contactName}</p>
                )}
                {(customer.email || customer.phone) && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {[customer.email, customer.phone].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {customer._count?.machines === 0 ? 'No machines' : `${customer._count?.machines ?? 0} machine(s)`}
                </p>
              </div>
            </Link>
            {(isAdmin || canArchive) && (
              <div
                ref={openMenuId === customer.id ? menuRef : null}
                className="absolute top-2 right-2"
                onClick={(e) => e.preventDefault()}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
                  title="Options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {openMenuId === customer.id && (
                  <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] z-10">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(customer);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    {canArchive && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(customer);
                          setOpenMenuId(null);
                        }}
                        disabled={archiveMutation.isPending}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {customer.isArchived ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                        {customer.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(customer);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="popup-panel max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-600">
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
