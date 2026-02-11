import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { machinesApi } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Search,
  Check,
  Upload,
  FileSpreadsheet,
  Download,
  Archive,
  RotateCcw
} from 'lucide-react';
import clsx from 'clsx';

const Machines = () => {
  const queryClient = useQueryClient();
  const { isAdmin, selectedBranch, effectiveBranch, user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['machines', { search, branch: effectiveBranch }],
    queryFn: () => machinesApi.getAll({ search, limit: '1000', branch: effectiveBranch }),
    enabled: !authLoading && !!user, // Wait for auth to be ready
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => machinesApi.delete(id),
    onSuccess: () => {
      toast.success('Machine deleted');
      queryClient.invalidateQueries(['machines']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete machine');
    },
  });

  const decommissionMutation = useMutation({
    mutationFn: (id) => machinesApi.decommission(id),
    onSuccess: () => {
      toast.success('Machine decommissioned');
      queryClient.invalidateQueries(['machines']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to decommission machine');
    },
  });

  const recommissionMutation = useMutation({
    mutationFn: (id) => machinesApi.recommission(id),
    onSuccess: () => {
      toast.success('Machine recommissioned');
      queryClient.invalidateQueries(['machines']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to recommission machine');
    },
  });

  // API now returns response.data directly, so data is { machines, pagination }
  const machines = data?.machines || [];

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setShowModal(true);
  };

  const handleDelete = (machine) => {
    if (window.confirm(`Delete machine ${machine.machineSerialNumber}? This will permanently remove the machine and all its readings.`)) {
      deleteMutation.mutate(machine.id);
    }
  };

  const handleDecommission = (machine) => {
    if (window.confirm(`Decommission machine ${machine.machineSerialNumber}? It will be removed from capture lists but history will remain accessible.`)) {
      decommissionMutation.mutate(machine.id);
    }
  };

  const handleRecommission = (machine) => {
    if (!isAdmin) return;
    if (window.confirm(`Recommission machine ${machine.machineSerialNumber}? It will be added back to capture lists.`)) {
      recommissionMutation.mutate(machine.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMachine(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-600">Loading machines...</p>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status;
    const errorDetails = error?.response?.data?.details;
    const errorName = error?.response?.data?.name;
    
    // If it's a 401, suggest logging in again
    if (errorStatus === 401) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">Authentication Failed</p>
            <p className="text-gray-600 text-sm mb-4">
              Your session may have expired. Please try logging in again.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-2xl">
          <p className="text-red-600 font-semibold mb-2">Error loading machines</p>
          <p className="text-gray-600 text-sm mb-2">{errorMessage}</p>
          {errorStatus && (
            <p className="text-gray-500 text-xs mb-2">Status: {errorStatus}</p>
          )}
          {errorDetails && (
            <div className="bg-gray-100 p-3 rounded text-left text-xs font-mono mb-3 max-h-40 overflow-auto">
              <p className="font-semibold mb-1">Error Details:</p>
              <p className="text-gray-700">{errorDetails}</p>
              {errorName && <p className="text-gray-600 mt-1">Type: {errorName}</p>}
            </div>
          )}
          <div className="space-y-2">
            <button
              onClick={() => queryClient.invalidateQueries(['machines'])}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Check the backend console (terminal where server is running) for full error details
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machines</h1>
          <p className="text-gray-500">Manage copier machines and meter configurations</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
          )}
          <button
            data-tour="add-machine"
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Machine
          </button>
        </div>
      </div>

      {/* Search */}
      <div data-tour="machines-search" className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div data-tour="machines-table" className="bg-white/35 backdrop-blur-2xl backdrop-saturate-150 rounded-xl shadow-xl border border-white/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Meters</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No machines found. {data ? 'Try adjusting your search.' : 'Loading...'}
                  </td>
                </tr>
              ) : (
                machines.map((machine) => (
                <tr key={machine.id} className={clsx(!machine.isActive && 'bg-gray-50 opacity-60')}>
                  <td className="px-4 py-3 font-medium text-gray-900">{machine.machineSerialNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{machine.customer || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{machine.model || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                      machine.branch === 'JHB' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    )}>
                      {machine.branch}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <MeterBadge label="M" enabled={machine.monoEnabled} />
                      <MeterBadge label="C" enabled={machine.colourEnabled} />
                      <MeterBadge label="S" enabled={machine.scanEnabled} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {machine.isDecommissioned ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Decommissioned
                      </span>
                    ) : (
                      <span className={clsx(
                        'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                        machine.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {machine.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(machine)}
                      className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {machine.isDecommissioned ? (
                      isAdmin ? (
                        <button
                          onClick={() => handleRecommission(machine)}
                          className="p-1 text-gray-500 hover:text-green-600 transition-colors ml-2"
                          title="Recommission"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : null
                    ) : (
                      <button
                        onClick={() => handleDecommission(machine)}
                        className="p-1 text-gray-500 hover:text-orange-600 transition-colors ml-2"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(machine)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors ml-2"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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

      {/* Modal */}
      {showModal && (
        <MachineModal
          machine={editingMachine}
          onClose={handleCloseModal}
        />
      )}

      {/* Import Modal */}
      {isAdmin && showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};

const MeterBadge = ({ label, enabled }) => (
  <span className={clsx(
    'inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium',
    enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
  )}>
    {label}
  </span>
);

const MachineModal = ({ machine, onClose }) => {
  const queryClient = useQueryClient();
  const { isAdmin, effectiveBranch } = useAuth();
  const isEditing = !!machine;

  const [formData, setFormData] = useState({
    machineSerialNumber: machine?.machineSerialNumber || '',
    customer: machine?.customer || '',
    model: machine?.model || '',
    branch: machine?.branch || effectiveBranch || 'JHB',
    monoEnabled: machine?.monoEnabled ?? true,
    colourEnabled: machine?.colourEnabled ?? false,
    scanEnabled: machine?.scanEnabled ?? false,
    isActive: machine?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data) => isEditing 
      ? machinesApi.update(machine.id, data)
      : machinesApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Machine updated' : 'Machine created');
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Machine' : 'Add Machine'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Machine Serial Number *
            </label>
            <input
              type="text"
              name="machineSerialNumber"
              value={formData.machineSerialNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="JHB">Johannesburg (JHB)</option>
                <option value="CT">Cape Town (CT)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enabled Meters
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="monoEnabled"
                  checked={formData.monoEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm">Mono</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="colourEnabled"
                  checked={formData.colourEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm">Colour</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="scanEnabled"
                  checked={formData.scanEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm">Scan</span>
              </label>
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm font-medium">Active</span>
            </label>
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

const ImportModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { effectiveBranch } = useAuth();
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);

  // CSV parsing function - handles quoted values
  const parseCSVLine = (line) => {
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
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreview(null);

    // Parse CSV file
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            setErrors(['CSV file must have at least a header row and one data row']);
            return;
          }

          // Parse header - handle quoted values
          const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
          
          // Check for required header
          if (!headers.includes('serial number')) {
            setErrors(['CSV must have a "Serial Number" column']);
            return;
          }

          // Parse data rows
          const data = [];
          for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
            const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              switch (header) {
                case 'serial number':
                  row.machineSerialNumber = value;
                  break;
                case 'customer':
                  row.customer = value;
                  break;
                case 'model':
                  row.model = value;
                  break;
                case 'mono enabled':
                  row.monoEnabled = value;
                  break;
                case 'colour enabled':
                  row.colourEnabled = value;
                  break;
                case 'scan enabled':
                  row.scanEnabled = value;
                  break;
                case 'mono reading':
                  row.monoReading = value;
                  break;
                case 'colour reading':
                  row.colourReading = value;
                  break;
                case 'scan reading':
                  row.scanReading = value;
                  break;
                case 'year':
                  row.year = value;
                  break;
                case 'month':
                  row.month = value;
                  break;
              }
            });
            data.push(row);
          }
          setPreview({ headers, data, totalRows: lines.length - 1 });
        } catch (error) {
          setErrors([`Error parsing CSV: ${error.message}`]);
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
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            toast.error('CSV file must have at least a header row and one data row');
            setImporting(false);
            return;
          }

          // Parse header - handle quoted values
          const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
          
          if (!headers.includes('serial number')) {
            toast.error('CSV must have a "Serial Number" column');
            setImporting(false);
            return;
          }

          // Parse all data rows
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              switch (header) {
                case 'serial number':
                  row.machineSerialNumber = value;
                  break;
                case 'customer':
                  row.customer = value;
                  break;
                case 'model':
                  row.model = value;
                  break;
                case 'mono enabled':
                  row.monoEnabled = value;
                  break;
                case 'colour enabled':
                  row.colourEnabled = value;
                  break;
                case 'scan enabled':
                  row.scanEnabled = value;
                  break;
                case 'mono reading':
                  row.monoReading = value;
                  break;
                case 'colour reading':
                  row.colourReading = value;
                  break;
                case 'scan reading':
                  row.scanReading = value;
                  break;
                case 'year':
                  row.year = value;
                  break;
                case 'month':
                  row.month = value;
                  break;
              }
            });
            if (row.machineSerialNumber) {
              data.push(row);
            }
          }

          if (data.length === 0) {
            toast.error('No valid data rows found');
            setImporting(false);
            return;
          }

          // Import data
          const response = await machinesApi.import(data, year, month, effectiveBranch);
          const results = response.data.results;

          toast.success(
            `Import complete: ${results.created} created, ${results.updated} updated, ${results.readingsCreated} readings created`
          );

          if (results.errors.length > 0) {
            console.warn('Import errors:', results.errors);
            toast(`${results.errors.length} rows had errors`, { icon: '⚠️' });
          }

          queryClient.invalidateQueries(['machines']);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Import Machines</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format Required:</h3>
                <p className="text-sm text-blue-800 mb-2">Columns (in order):</p>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Serial Number (required – also used as contract reference)</li>
                  <li>Customer (optional)</li>
                  <li>Model (optional)</li>
                  <li>Mono Enabled (yes/no)</li>
                  <li>Colour Enabled (yes/no)</li>
                  <li>Scan Enabled (yes/no)</li>
                  <li>Mono Reading (optional, for historical data)</li>
                  <li>Colour Reading (optional, for historical data)</li>
                  <li>Scan Reading (optional, for historical data)</li>
                  <li>Year (optional, defaults to selected year)</li>
                  <li>Month (optional, defaults to selected month)</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  const csv = 'Serial Number,Customer,Model,Mono Enabled,Colour Enabled,Scan Enabled,Mono Reading,Colour Reading,Scan Reading,Year,Month\nCPR-001,Reception Area,Canon iR-ADV C5535,yes,yes,yes,50000,20000,5000,2024,1';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'machine-import-template.csv';
                  link.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Year/Month Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year (default for readings)
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2000"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month (default for readings)
              </label>
              <input
                type="number"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                min="1"
                max="12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Preview (first 5 rows of {preview.totalRows} total)
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
                      {preview.data.map((row, i) => (
                        <tr key={i}>
                          {preview.headers.map((header, j) => (
                            <td key={j} className="px-2 py-2 text-gray-600">
                              {row[header] || '-'}
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

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing || errors.length > 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Machines;
