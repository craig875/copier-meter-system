import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Building2, Plus, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import MachineModal from '../components/MachineModal';
import CustomerMachineOverviewRow from '../components/CustomerMachineOverviewRow';
import { captureElementToPdf } from '../utils/captureElementToPdf';

function pdfBaseName(name) {
  return (name || 'customer').replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 80) || 'customer';
}

const CustomerDetail = () => {
  const { customerId } = useParams();
  const { effectiveBranch } = useAuth();
  const pdfCaptureRef = useRef(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getOne(customerId),
    enabled: !!customerId,
  });

  const { data: tonerAlertsData } = useQuery({
    queryKey: ['toner-alerts', effectiveBranch],
    queryFn: () => consumablesApi.getTonerAlerts(effectiveBranch),
  });

  const customer = data?.customer;
  const machines = customer?.machines || [];

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

      <div ref={pdfCaptureRef} className="space-y-6 bg-white" data-pdf-capture-root>
        <div className="tile-card p-6">
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
              <button
                type="button"
                onClick={() => setShowAddMachine(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add machine
              </button>
            </div>
          </div>
          {machines.length === 0 ? (
            <p className="text-gray-500 py-4">
              No machines linked to this customer. Add machines from the Machines page and link them to this customer.
            </p>
          ) : (
            <div>
              {machines.map((machine) => (
                <CustomerMachineOverviewRow
                  key={machine.id}
                  machine={machine}
                  partsDue={partsDueByMachine[machine.id] || []}
                  effectiveBranch={effectiveBranch}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddMachine && (
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
