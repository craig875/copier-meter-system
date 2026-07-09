import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';
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
  Upload,
  Download,
} from 'lucide-react';

/** CSV line parser (quoted fields) — matches Machines import */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function buildCustomerOnlyRow(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    const value = (values[index] || '').replace(/^"|"$/g, '');
    switch (header) {
      case 'customer':
      case 'name':
        row.customer = value;
        break;
      case 'contact name':
      case 'contact_name':
        row.contactName = value;
        break;
      case 'email':
        row.email = value;
        break;
      case 'phone':
        row.phone = value;
        break;
      case 'address':
        row.address = value;
        break;
      case 'branch':
        row.branch = value;
        break;
      default:
        break;
    }
  });
  return row;
}

const CustomerBulkImportModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreview(null);

    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter((line) => line.trim());
          if (lines.length < 2) {
            setErrors(['CSV file must have a header row and at least one data row']);
            return;
          }

          const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
          const hasName = headers.includes('customer') || headers.includes('name');
          if (!hasName) {
            setErrors(['CSV must include a Customer column (or Name).']);
            return;
          }

          const rows = [];
          for (let i = 1; i < Math.min(lines.length, 6); i++) {
            const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, ''));
            rows.push(values);
          }
          setPreview({ headers, rows, totalRows: lines.length - 1 });
        } catch (err) {
          setErrors([`Error parsing CSV: ${err.message}`]);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setErrors(['Please upload a CSV file']);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter((line) => line.trim());

          if (lines.length < 2) {
            toast.error('CSV file must have a header row and at least one data row');
            setImporting(false);
            return;
          }

          const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
          if (!headers.includes('customer') && !headers.includes('name')) {
            toast.error('CSV must include a Customer column (or Name)');
            setImporting(false);
            return;
          }

          const data = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, ''));
            const row = buildCustomerOnlyRow(headers, values);
            const name =
              (typeof row.customer === 'string' && row.customer.trim()) ||
              (typeof row.name === 'string' && row.name.trim()) ||
              '';
            if (!name) continue;
            data.push(row);
          }

          if (data.length === 0) {
            toast.error('No rows with a customer name');
            setImporting(false);
            return;
          }

          const result = await customersApi.importBulk(data, effectiveBranch);
          const results = result.results;

          toast.success(
            `Import complete: ${results.created} created, ${results.skipped} skipped (already exist or duplicate in file)`
          );

          if (results.errors?.length > 0) {
            toast(`${results.errors.length} rows had errors`, { icon: '⚠️' });
          }

          queryClient.invalidateQueries(['customers']);
          onClose();
        } catch (error) {
          console.error('Import error:', error);
          toast.error(error.response?.data?.error || 'Failed to import data');
          if (error.response?.data?.details) {
            setErrors([error.response.data.details]);
          }
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file');
      setImporting(false);
    }
  };

  const templateCsv =
    'Customer,Contact Name,Email,Phone,Address,Branch\n' +
    'Acme Ltd,Jane Doe,jane@example.com,0215550000,1 Example Rd,JHB';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="popup-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Import customers</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-950">
            <p className="font-medium mb-1">Customers only</p>
            <p>
              Each row creates one customer if the name does not already exist for your branch. Add machines later from{' '}
              <Link to="/machines" className="text-red-700 underline font-medium">
                Machines
              </Link>
              . Optional columns: Contact Name, Email, Phone, Address, Branch (per row; otherwise your current branch is used).
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([templateCsv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'customer-import-template.csv';
                link.click();
                window.URL.revokeObjectURL(url);
              }}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download template
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSV file</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {preview && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Preview (first {preview.rows.length} of {preview.totalRows} rows)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map((header, i) => (
                          <th key={i} className="px-2 py-2 text-left font-medium text-gray-700">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.rows.map((values, i) => (
                        <tr key={i}>
                          {preview.headers.map((_, j) => (
                            <td key={j} className="px-2 py-2 text-gray-600">
                              {values[j] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Customers = ({ title = 'Customers' }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch, isElevated, isMeterUser } = useAuth();
  const canArchive = isElevated || isMeterUser;
  const [listTab, setListTab] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    queryKey: ['customers', effectiveBranch, listTab],
    queryFn: () => customersApi.getAll(effectiveBranch, { archived: listTab === 'archived' }),
  });

  const { data: tonerAlertsData } = useQuery({
    queryKey: ['toner-alerts', effectiveBranch],
    queryFn: () => consumablesApi.getTonerAlerts(effectiveBranch),
    enabled: listTab === 'active',
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
      const details = error.response?.data?.errors;
      const machineList = Array.isArray(details)
        ? details
            .map((e) => e.machineSerialNumber || e.message)
            .filter(Boolean)
            .join(', ')
        : null;
      const message = error.response?.data?.error || 'Failed to update customer';
      toast.error(machineList ? `${message} ${machineList}` : message, { duration: 6000 });
    },
  });

  const customers = data?.customers || [];

  const totalMachines = useMemo(
    () => customers.reduce((sum, c) => sum + (c._count?.machines ?? 0), 0),
    [customers]
  );

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleArchive = (customer) => {
    const willArchive = listTab === 'active';
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
      <div data-tour="customers-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">
            {listTab === 'active'
              ? 'Select a customer to view machines and record consumable orders'
              : 'Archived customers are hidden from capture, consumables, and toner alerts'}
            <span className="ml-2 text-gray-400 font-medium">
              · {customers.length} customer{customers.length !== 1 ? 's' : ''} · {totalMachines} machine{totalMachines !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isElevated && listTab === 'active' && (
            <>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setListTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            listTab === 'active'
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setListTab('archived')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            listTab === 'archived'
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Archived
        </button>
      </div>

      <div data-tour="customers-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`tile-card p-4 relative group ${
              listTab === 'archived' ? '!bg-gray-50 opacity-90' : ''
            }`}
          >
            <Link
              to={`/customers/${customer.id}`}
              className="block flex"
            >
              {/* Left: status badges only (no icon) */}
              {(listTab === 'archived' || tonerAlertsByCustomer[customer.id]) && (
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 pr-4 border-r border-gray-200 gap-1">
                  {listTab === 'archived' && (
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
              <div className={`flex-1 min-w-0 flex flex-col pr-10 ${(listTab === 'archived' || tonerAlertsByCustomer[customer.id]) ? 'pl-4' : ''}`}>
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
            {(isElevated || canArchive) && (
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
                    {isElevated && (
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
                        {listTab === 'archived' ? 'Unarchive' : 'Archive'}
                      </button>
                    )}
                    {isElevated && (
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

      {isElevated && showImportModal && (
        <CustomerBulkImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
};

const branchLabel = (b) => {
  if (b === 'CT') return 'Cape Town (CT)';
  if (b === 'JHB') return 'Johannesburg (JHB)';
  return b || '—';
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
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (isEditing) {
        payload.branch = customer.branch ?? null;
      } else {
        payload.branch = effectiveBranch || null;
      }
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
    const { name, value, tagName } = e.target;
    const v = tagName === 'SELECT' ? value : (typeof value === 'string' ? trimLeading(value) : value);
    setFormData((prev) => ({ ...prev, [name]: v }));
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

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
            {isEditing ? (
              <>
                <span className="font-medium text-gray-800">Branch: </span>
                {branchLabel(customer.branch)}
              </>
            ) : (
              <>
                <span className="font-medium text-gray-800">New customers are added to: </span>
                {effectiveBranch ? branchLabel(effectiveBranch) : 'Select a branch in the header first.'}
              </>
            )}
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
