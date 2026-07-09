import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, consumablesApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Building2, Plus, FileDown, Archive, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import MachineModal from '../components/MachineModal';
import CustomerMachineOverviewRow from '../components/CustomerMachineOverviewRow';
import { captureElementToPdf } from '../utils/captureElementToPdf';

function pdfBaseName(name) {
  return (name || 'customer').replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 80) || 'customer';
}

const CustomerDetail = () => {
  const { customerId } = useParams();
  const queryClient = useQueryClient();
  const { effectiveBranch, isElevated, isMeterUser } = useAuth();
  const canManageMachines = isElevated || isMeterUser;
  const pdfCaptureRef = useRef(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [machineTab, setMachineTab] = useState('active');

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getOne(customerId),
    enabled: !!customerId,
  });

  const { data: tonerAlertsData } = useQuery({
    queryKey: ['toner-alerts', effectiveBranch],
    queryFn: () => consumablesApi.getTonerAlerts(effectiveBranch),
    enabled: !data?.customer?.isArchived,
  });

  const decommissionMutation = useMutation({
    mutationFn: (id) => machinesApi.decommission(id),
    onSuccess: () => {
      toast.success('Machine decommissioned');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to decommission machine'),
  });

  const recommissionMutation = useMutation({
    mutationFn: (id) => machinesApi.recommission(id),
    onSuccess: () => {
      toast.success('Machine recommissioned');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to recommission machine'),
  });

  const customer = data?.customer;
  const machines = customer?.machines || [];
  const activeMachines = machines.filter((m) => !m.isDecommissioned);
  const decommissionedMachines = machines.filter((m) => m.isDecommissioned);
  const visibleMachines = machineTab === 'active' ? activeMachines : decommissionedMachines;

  const partsDueByMachine = (tonerAlertsData?.customerAlerts || [])
    .filter((a) => a.customerId === customerId)
    .flatMap((a) => a.partsDue)
    .reduce((acc, p) => {
      if (!acc[p.machineId]) acc[p.machineId] = [];
      acc[p.machineId].push(p);
      return acc;
    }, {});

  const handleExportPdf = async () => {
    if (!customer || machines.length === 0 || !pdfCaptureRef.current) return;
    setExportingPdf(true);
    try {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      await captureElementToPdf(pdfCaptureRef.current, {
        filename: `${pdfBaseName(customer.name)}-customer-machines.pdf`,
        orientation: 'portrait',
        scale: 2.5,
        margin: 16,
        layoutScale: 1.08,
      });
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e?.message || 'Could not export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDecommission = (machine) => {
    if (!window.confirm(`Decommission machine ${machine.machineSerialNumber}?`)) return;
    decommissionMutation.mutate(machine.id);
  };

  const handleRecommission = (machine) => {
    if (!window.confirm(`Restore machine ${machine.machineSerialNumber} to active service?`)) return;
    recommissionMutation.mutate(machine.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="tile-card p-6">
        <p className="text-red-600">Customer not found</p>
        <Link to="/customers" className="text-red-600 hover:underline mt-2 inline-block">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4" data-pdf-exclude>
        <Link
          to="/customers"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Customers
        </Link>
      </div>

      {customer.isArchived && (
        <div className="tile-card p-4 border-l-4 border-gray-400 bg-gray-50 text-sm text-gray-700">
          This customer is archived and is hidden from capture, consumables, and toner alerts.
          Unarchive from the Archived tab on the customers list to add machines or return them to active workflows.
        </div>
      )}

      <div ref={pdfCaptureRef} className="space-y-6 bg-white" data-pdf-capture-root>
        <div className="tile-card p-6" data-pdf-row>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-50 rounded-lg">
              <Building2 className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              {customer.contactName && (
                <p className="text-gray-600">{customer.contactName}</p>
              )}
              {(customer.email || customer.phone) && (
                <p className="text-sm text-gray-500 mt-1">
                  {customer.email}
                  {customer.email && customer.phone && ' · '}
                  {customer.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="tile-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Machines</h2>
            <div className="flex flex-wrap items-center gap-2" data-pdf-exclude>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={machines.length === 0 || exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Export PDF
              </button>
              {canManageMachines && !customer.isArchived && (
                <button
                  type="button"
                  onClick={() => setShowAddMachine(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add machine
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 border-b border-gray-200 mb-4" data-pdf-exclude>
            <button
              type="button"
              onClick={() => setMachineTab('active')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                machineTab === 'active'
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Active ({activeMachines.length})
            </button>
            <button
              type="button"
              onClick={() => setMachineTab('decommissioned')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                machineTab === 'decommissioned'
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Decommissioned ({decommissionedMachines.length})
            </button>
          </div>

          {customer.isArchived && canManageMachines && (
            <p className="text-sm text-gray-500 mb-4" data-pdf-exclude>
              Unarchive this customer before adding new machines.
            </p>
          )}

          {visibleMachines.length === 0 ? (
            <p className="text-gray-500 py-4">
              {machineTab === 'active'
                ? 'No active machines linked to this customer.'
                : 'No decommissioned machines for this customer.'}
            </p>
          ) : (
            <div>
              {visibleMachines.map((machine) => (
                <div key={machine.id}>
                  <CustomerMachineOverviewRow
                    machine={machine}
                    partsDue={partsDueByMachine[machine.id] || []}
                    effectiveBranch={effectiveBranch}
                  />
                  {canManageMachines && (
                    <div className="flex justify-end pb-4 -mt-2" data-pdf-exclude>
                      {machine.isDecommissioned ? (
                        <button
                          type="button"
                          onClick={() => handleRecommission(machine)}
                          disabled={recommissionMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Recommission
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDecommission(machine)}
                          disabled={decommissionMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                        >
                          <Archive className="h-4 w-4" />
                          Decommission
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddMachine && !customer.isArchived && (
        <MachineModal
          machine={null}
          onClose={() => setShowAddMachine(false)}
          initialCustomerId={customerId}
          lockCustomer
        />
      )}
    </div>
  );
};

export default CustomerDetail;
