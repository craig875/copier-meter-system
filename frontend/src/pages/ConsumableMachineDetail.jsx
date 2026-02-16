import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consumablesApi, machinesApi, readingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Plus,
  Printer,
  Trash2,
  Copy,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { useState } from 'react';
import MeterBlocks from '../components/MeterBlocks';

const ConsumableMachineDetail = () => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveBranch, isAdmin } = useAuth();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    modelPartId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    currentReading: '',
    remainingTonerPercent: '',
  });

  const { data: machineData, isLoading: machineLoading } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => machinesApi.getOne(machineId).then((r) => r.data),
    enabled: !!machineId,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['consumables-history', machineId, effectiveBranch],
    queryFn: () => consumablesApi.getMachineHistory(machineId, effectiveBranch),
    enabled: !!machineId,
  });

  const modelId = machineData?.machine?.modelId || machineData?.machine?.model?.id;
  const { data: readingsHistoryData } = useQuery({
    queryKey: ['readings-history', machineId, effectiveBranch],
    queryFn: () => readingsApi.getHistory(machineId, 24, effectiveBranch).then((r) => r.data),
    enabled: !!machineId,
  });

  const { data: partsData } = useQuery({
    queryKey: ['model-parts', modelId, effectiveBranch],
    queryFn: () => consumablesApi.getModelParts(modelId, effectiveBranch),
    enabled: !!modelId,
  });

  const recordMutation = useMutation({
    mutationFn: (payload) => consumablesApi.recordPartOrder(payload),
    onSuccess: () => {
      toast.success('Part order recorded');
      setShowOrderModal(false);
      setOrderForm({ modelPartId: '', orderDate: new Date().toISOString().slice(0, 10), currentReading: '', remainingTonerPercent: '' });
      queryClient.invalidateQueries(['consumables-history', machineId]);
      queryClient.invalidateQueries(['consumables-summary']);
      queryClient.invalidateQueries(['toner-alerts']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to record order');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => consumablesApi.deletePartOrder(id),
    onSuccess: () => {
      toast.success('Part order deleted');
      queryClient.invalidateQueries(['consumables-history', machineId]);
      queryClient.invalidateQueries(['consumables-summary']);
      queryClient.invalidateQueries(['toner-alerts']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to delete order');
    },
  });

  const machine = machineData?.machine || historyData?.machine;
  const replacements = historyData?.replacements || [];
  const modelParts = partsData?.parts || [];

  const generalParts = replacements.filter((r) => r.partType === 'general');
  const tonerParts = replacements.filter((r) => r.partType === 'toner');

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    const part = modelParts.find((p) => p.id === orderForm.modelPartId);
    if (!part) {
      toast.error('Select a part');
      return;
    }
    const currentReading = parseInt(orderForm.currentReading, 10);
    if (isNaN(currentReading) || currentReading < 0) {
      toast.error('Enter valid current reading');
      return;
    }
    if (part.partType === 'toner' && orderForm.remainingTonerPercent !== '') {
      const pct = parseFloat(orderForm.remainingTonerPercent);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('Toner % must be 0–100');
        return;
      }
    }
    recordMutation.mutate({
      machineId,
      modelPartId: orderForm.modelPartId,
      orderDate: orderForm.orderDate,
      currentReading,
      remainingTonerPercent: part.partType === 'toner' ? (orderForm.remainingTonerPercent ? parseFloat(orderForm.remainingTonerPercent) : 0) : undefined,
    });
  };

  if (machineLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Machine not found</p>
        <Link to="/consumables/summary" className="text-red-600 hover:underline mt-2 inline-block">
          ← Back to Summary
        </Link>
      </div>
    );
  }

  const handleDeleteOrder = (r) => {
    if (window.confirm(`Delete this part order record?\n\n${r.partName} • ${r.orderDate ? new Date(r.orderDate).toLocaleDateString() : ''}\n\nThis cannot be undone.`)) {
      deleteOrderMutation.mutate(r.id);
    }
  };

  const buildCopyLine = (r) => {
    const date = r.orderDate ? new Date(r.orderDate).toLocaleDateString() : '-';
    const prior = r.priorReading?.toLocaleString() ?? '-';
    const current = r.currentReading?.toLocaleString() ?? '-';
    const usage = r.usage?.toLocaleString() ?? '-';
    const shortfall = r.partType === 'toner' && r.adjustedShortfallClicks > 0
      ? r.adjustedShortfallClicks
      : (r.shortfallClicks ?? 0);
    const charge = r.displayChargeRand > 0 ? Number(r.displayChargeRand).toFixed(2) : '0';
    return [r.partName, date, prior, current, usage, shortfall, `R${charge}`].join('\t');
  };

  const handleCopyLine = async (r) => {
    try {
      const line = buildCopyLine(r);
      await navigator.clipboard.writeText(line);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const PartRow = ({ r }) => (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-2 text-gray-700">{r.partName}</td>
      <td className="py-2 px-2 text-gray-600">
        {r.orderDate ? new Date(r.orderDate).toLocaleDateString() : '-'}
      </td>
      <td className="py-2 px-2 text-right">{r.priorReading?.toLocaleString() ?? '-'}</td>
      <td className="py-2 px-2 text-right">{r.currentReading?.toLocaleString() ?? '-'}</td>
      <td className="py-2 px-2 text-right">{r.usage?.toLocaleString() ?? '-'}</td>
      {r.partType === 'toner' && (
        <td className="py-2 px-2 text-center">
          {r.remainingTonerPercent != null ? `${r.remainingTonerPercent}%` : '-'}
        </td>
      )}
      <td className="py-2 px-2 text-center">
        {r.yieldMet ? (
          <CheckCircle className="h-5 w-5 text-green-600 inline" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 inline" />
        )}
      </td>
      <td className="py-2 px-2 text-right">
        {r.partType === 'toner' && r.adjustedShortfallClicks > 0 ? (
          <span className="text-amber-700 font-medium">{r.adjustedShortfallClicks} clicks</span>
        ) : r.shortfallClicks > 0 ? (
          <span className="text-amber-700 font-medium">{r.shortfallClicks} clicks</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="py-2 px-2 text-right font-medium">
        {r.displayChargeRand > 0 ? (
          <span className="text-amber-700">R{Number(r.displayChargeRand).toFixed(2)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => handleCopyLine(r)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Copy line for service software"
          >
            <Copy className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleDeleteOrder(r)}
              disabled={deleteOrderMutation.isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Delete part order"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={(machine?.customer?.id || machine?.customerId) ? `/customers/${machine.customer?.id || machine.customerId}` : '/customers'}
          className="flex items-center text-gray-600 hover:text-red-600"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {(machine?.customer?.id || machine?.customerId) ? `Back to ${machine.customer?.name ?? machine.customer ?? 'Customer'}` : 'Back to Customers'}
        </Link>
        <button
          onClick={() => setShowOrderModal(true)}
          disabled={modelParts.length === 0}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5 mr-2" />
          Record part order
        </button>
      </div>

      <div className="liquid-glass rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-50 rounded-lg flex items-center gap-3">
            <Printer className="h-8 w-8 text-red-600" />
            <MeterBlocks isColour={machine.model?.modelType === 'colour'} size="lg" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{machine.machineSerialNumber}</h2>
            <p className="text-gray-600">
              {machine.model ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim() || 'No model' : 'No model'} • {(typeof machine.customer === 'string' ? machine.customer : machine.customer?.name) || 'No customer'}
            </p>
          </div>
        </div>
      </div>

      {machine.nearEndOfLife && (
        <div className="liquid-glass rounded-xl p-4 border-amber-300 bg-amber-50/80 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-900">Near end of life</p>
            <p className="text-sm text-amber-800">
              This machine has reached {machine.lifePercentUsed}% of its estimated lifespan
              {machine.model?.machineLife ? ` (${machine.model.machineLife.toLocaleString()} pages)` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Meter reading history - list with link to full page */}
      <div className="liquid-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Meter reading history</h3>
          {(readingsHistoryData?.readings?.length ?? 0) > 0 && (
            <Link
              to={`/consumables/machines/${machineId}/readings`}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {(readingsHistoryData?.readings?.length ?? 0) === 0 ? (
          <p className="text-gray-500 py-4">No meter readings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Month/Year</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Mono</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Colour</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Scan</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Usage</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(readingsHistoryData?.readings || []).slice(0, 5).map((r) => {
                  const usage = (r.monoUsage ?? 0) + (r.colourUsage ?? 0) + (r.scanUsage ?? 0);
                  const monthName = new Date(r.year, r.month - 1).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <tr
                      key={r.id || `${r.machineId}-${r.year}-${r.month}`}
                      onClick={() => navigate(`/consumables/machines/${machineId}/readings`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-2 px-2 text-gray-700 font-medium">{monthName}</td>
                      <td className="py-2 px-2 text-right">{r.monoReading?.toLocaleString() ?? '-'}</td>
                      <td className="py-2 px-2 text-right">{r.colourReading?.toLocaleString() ?? '-'}</td>
                      <td className="py-2 px-2 text-right">{r.scanReading?.toLocaleString() ?? '-'}</td>
                      <td className="py-2 px-2 text-right">{usage.toLocaleString()}</td>
                      <td className="py-2 px-2 text-center text-gray-600">
                        {r.capturedAt
                          ? new Date(r.capturedAt).toLocaleString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toner */}
      <div className="liquid-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Toner</h3>
        {tonerParts.length === 0 ? (
          <p className="text-gray-500 py-4">No toner orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium">Part</th>
                  <th className="text-left py-2 px-2 font-medium">Last order</th>
                  <th className="text-right py-2 px-2 font-medium">Prior</th>
                  <th className="text-right py-2 px-2 font-medium">Current</th>
                  <th className="text-right py-2 px-2 font-medium">Usage</th>
                  <th className="text-center py-2 px-2 font-medium">Toner %</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-2 font-medium">Adj. shortfall</th>
                  <th className="text-right py-2 px-2 font-medium">Charge</th>
                  <th className="py-2 px-2 w-20 text-center">Copy</th>
                </tr>
              </thead>
              <tbody>
                {tonerParts.map((r) => (
                  <PartRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* General Parts */}
      <div className="liquid-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General parts</h3>
        {generalParts.length === 0 ? (
          <p className="text-gray-500 py-4">No general part orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium">Part</th>
                  <th className="text-left py-2 px-2 font-medium">Last order</th>
                  <th className="text-right py-2 px-2 font-medium">Prior</th>
                  <th className="text-right py-2 px-2 font-medium">Current</th>
                  <th className="text-right py-2 px-2 font-medium">Usage</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-2 font-medium">Shortfall</th>
                  <th className="text-right py-2 px-2 font-medium">Charge</th>
                  <th className="py-2 px-2 w-20 text-center">Copy</th>
                </tr>
              </thead>
              <tbody>
                {generalParts.map((r) => (
                  <PartRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="popup-panel p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Record part order</h3>
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
                <select
                  value={orderForm.modelPartId}
                  onChange={(e) => setOrderForm((f) => ({ ...f, modelPartId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select part...</option>
                  {modelParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partName} ({p.partType}) - Yield {p.expectedYield?.toLocaleString()}, R{Number(p.costRand || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order date</label>
                <input
                  type="date"
                  value={orderForm.orderDate}
                  onChange={(e) => setOrderForm((f) => ({ ...f, orderDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current meter reading</label>
                <input
                  type="number"
                  min="0"
                  value={orderForm.currentReading}
                  onChange={(e) => setOrderForm((f) => ({ ...f, currentReading: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 118000"
                  required
                />
              </div>
              {modelParts.find((p) => p.id === orderForm.modelPartId)?.partType === 'toner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining toner % (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={orderForm.remainingTonerPercent}
                    onChange={(e) => setOrderForm((f) => ({ ...f, remainingTonerPercent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. 10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to reduce shortfall charge when ordering early</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={recordMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {recordMutation.isPending ? 'Saving...' : 'Record order'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modelParts.length === 0 && machine.modelId && (
        <div className="liquid-glass rounded-xl p-6 border-amber-200 bg-amber-50/50">
          <p className="text-amber-800">
            No consumable parts are defined for this model. An admin must add parts under Consumables → Model Parts.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsumableMachineDetail;
