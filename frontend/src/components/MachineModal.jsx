import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { machinesApi, makesApi, modelsApi, customersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { X, Check } from 'lucide-react';

/**
 * Modal for adding or editing a machine.
 * @param {Object} props
 * @param {Object} props.machine - Machine to edit (null for add)
 * @param {Function} props.onClose - Callback when modal closes
 * @param {string} [props.initialCustomerId] - Pre-select customer when adding
 * @param {boolean} [props.lockCustomer] - When true, hide customer dropdown (used when adding from Customer Detail)
 */
const MachineModal = ({ machine, onClose, initialCustomerId, lockCustomer = false }) => {
  const queryClient = useQueryClient();
  const { isAdmin, effectiveBranch } = useAuth();
  const isEditing = !!machine;

  const [formData, setFormData] = useState({
    machineSerialNumber: machine?.machineSerialNumber || '',
    customerId: machine?.customerId || machine?.customer?.id || initialCustomerId || '',
    makeId: machine?.model?.make?.id || '',
    modelId: machine?.modelId || machine?.model?.id || '',
    branch: machine?.branch || effectiveBranch || 'JHB',
    monoEnabled: machine?.monoEnabled ?? true,
    colourEnabled: machine?.colourEnabled ?? false,
    scanEnabled: machine?.scanEnabled ?? false,
    isActive: machine?.isActive ?? true,
  });

  const { data: makesData } = useQuery({
    queryKey: ['makes'],
    queryFn: () => makesApi.getAll(),
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers', effectiveBranch],
    queryFn: () => customersApi.getAll(effectiveBranch),
  });
  const { data: modelsData } = useQuery({
    queryKey: ['models', formData.makeId],
    queryFn: () => modelsApi.getAll(formData.makeId || null),
  });
  const makes = makesData?.makes || [];
  const models = modelsData?.models || [];
  const customers = customersData?.customers || [];

  const mutation = useMutation({
    mutationFn: (data) => {
      const { makeId, ...rest } = data;
      const payload = { ...rest, customerId: rest.customerId || null };
      return isEditing
        ? machinesApi.update(machine.id, payload)
        : machinesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Machine updated' : 'Machine created');
      queryClient.invalidateQueries(['machines']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['customer']);
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
    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value };
      if (name === 'makeId') {
        next.modelId = '';
      } else if (name === 'modelId' && value) {
        // Auto-set meters from model type: mono model = mono only, colour model = mono + colour, scan always on
        const selectedModel = models.find(m => m.id === value);
        if (selectedModel) {
          const isColour = selectedModel.modelType === 'colour';
          next.monoEnabled = true;
          next.colourEnabled = isColour;
          next.scanEnabled = true;
        }
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
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

          {!lockCustomer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Make
            </label>
            <select
              name="makeId"
              value={formData.makeId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select make...</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              name="modelId"
              value={formData.modelId}
              onChange={handleChange}
              disabled={!formData.makeId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Select model...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.make?.name} {m.name} ({m.paperSize || 'A4'} · {m.modelType === 'colour' ? 'Colour' : 'Mono'})
                </option>
              ))}
            </select>
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

export default MachineModal;
