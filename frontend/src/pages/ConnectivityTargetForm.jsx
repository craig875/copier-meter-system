import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { normalizeFrom } from '../utils/navigationFrom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { connectivityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';

const SERVICE_TYPES = ['fibre', 'wireless', 'lte', 'other'];

export default function ConnectivityTargetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canManageConnectivity, effectiveBranch } = useAuth();
  const isEdit = !!id;
  const fromFibreOrder = !isEdit ? location.state?.fromFibreOrder : null;

  const [form, setForm] = useState({
    customerName: '',
    siteName: '',
    supplier: '',
    circuitNumber: '',
    fno: '',
    monitoringTarget: '',
    serviceType: 'other',
    notes: '',
    alertEmail: '',
    contactPersonName: '',
    contactPersonPhone: '',
    status: 'enabled',
    dnsRefreshIntervalMinutes: 5,
  });

  const { data } = useQuery({
    queryKey: ['connectivity', 'target', id, effectiveBranch],
    queryFn: () => connectivityApi.getTarget(id, { branch: effectiveBranch }),
    enabled: isEdit && !!canManageConnectivity,
  });

  useEffect(() => {
    if (data?.target) {
      setForm({
        customerName: data.target.customerName || '',
        siteName: data.target.siteName || '',
        supplier: data.target.supplier || '',
        circuitNumber: data.target.circuitNumber || '',
        fno: data.target.fno || '',
        monitoringTarget: data.target.monitoringTarget || '',
        serviceType: data.target.serviceType || 'other',
        notes: data.target.notes || '',
        alertEmail: data.target.alertEmail || '',
        contactPersonName: data.target.contactPersonName || '',
        contactPersonPhone: data.target.contactPersonPhone || '',
        status: data.target.status || 'enabled',
        dnsRefreshIntervalMinutes: data.target.dnsRefreshIntervalMinutes ?? 5,
      });
    }
  }, [data?.target]);

  useEffect(() => {
    if (isEdit || !fromFibreOrder) return;
    const { fibreOrderId, ...prefill } = fromFibreOrder;
    setForm((current) => ({
      ...current,
      ...prefill,
      customerName: prefill.customerName || current.customerName,
      siteName: prefill.siteName || current.siteName,
      serviceType: prefill.serviceType || 'fibre',
    }));
  }, [isEdit, fromFibreOrder]);

  const createMutation = useMutation({
    mutationFn: (body) => connectivityApi.createTarget(body, effectiveBranch),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['connectivity'] });
      const newId = res?.target?.id;
      const passFrom = location.state?.from ? { from: location.state.from } : undefined;
      if (newId) navigate(`/connectivity/targets/${newId}`, { state: passFrom });
      else navigate(normalizeFrom(location.state?.from) || '/connectivity/targets');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body) => connectivityApi.updateTarget(id, body, effectiveBranch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectivity'] });
      const passFrom = location.state?.from ? { from: location.state.from } : undefined;
      navigate(`/connectivity/targets/${id}`, { state: passFrom });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { fibreOrderId, ...payload } = form;
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!canManageConnectivity) {
    return (
      <div className="tile-card p-6 text-center text-gray-500">
        Admin access required.
      </div>
    );
  }

  const mutating = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Target' : 'Add Monitoring Target'}
      </h1>

      {fromFibreOrder?.fibreOrderId && (
        <div className="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900">
          <p>
            Pre-filled from completed fibre order. Enter the monitoring IP or hostname, then save.
            Use the header Back button to return to that order.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="tile-card p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm select-text">
            <div className="font-medium">{error?.response?.data?.error || error?.message}</div>
            {error?.response?.data && Object.keys(error.response.data).length > 1 && (
              <pre className="mt-2 text-xs whitespace-pre-wrap break-words font-sans select-text">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(error.response.data).filter(([k]) => k !== 'error')
                  ),
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input
            type="text"
            required
            value={form.customerName}
            onChange={(e) => setForm((f) => ({ ...f, customerName: trimLeading(e.target.value) }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
          <input
            type="text"
            required
            value={form.siteName}
            onChange={(e) => setForm((f) => ({ ...f, siteName: trimLeading(e.target.value) }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <input
            type="text"
            value={form.supplier}
            onChange={(e) => setForm((f) => ({ ...f, supplier: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Circuit Number</label>
          <input
            type="text"
            value={form.circuitNumber}
            onChange={(e) => setForm((f) => ({ ...f, circuitNumber: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">FNO</label>
          <input
            type="text"
            value={form.fno}
            onChange={(e) => setForm((f) => ({ ...f, fno: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Target (IP or hostname) *</label>
          <input
            type="text"
            required
            placeholder="e.g. 8.8.8.8 or gateway.example.com"
            value={form.monitoringTarget}
            onChange={(e) => setForm((f) => ({ ...f, monitoringTarget: trimLeading(e.target.value) }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
          <select
            value={form.serviceType}
            onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alert Email</label>
          <input
            type="email"
            value={form.alertEmail}
            onChange={(e) => setForm((f) => ({ ...f, alertEmail: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input
            type="text"
            value={form.contactPersonName}
            onChange={(e) => setForm((f) => ({ ...f, contactPersonName: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
          <input
            type="tel"
            value={form.contactPersonPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPersonPhone: trimLeading(e.target.value) }))}
            placeholder="optional"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: trimLeading(e.target.value) }))}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={mutating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutating ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <Link to="/connectivity/targets" className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
