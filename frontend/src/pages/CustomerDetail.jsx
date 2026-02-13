import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Building2, Printer, Package, ChevronRight, Pencil, AlertTriangle, Plus, AlertCircle } from 'lucide-react';
import MachineModal from '../components/MachineModal';
import MeterBlocks from '../components/MeterBlocks';

const CustomerDetail = () => {
  const { customerId } = useParams();
  const { effectiveBranch } = useAuth();
  const [showAddMachine, setShowAddMachine] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="liquid-glass rounded-xl p-6">
        <p className="text-red-600">Customer not found</p>
        <Link to="/customers" className="text-red-600 hover:underline mt-2 inline-block">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Customers
        </Link>
      </div>

      <div className="liquid-glass rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-50 rounded-lg">
            <Building2 className="h-8 w-8 text-red-600" />
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

      <div className="liquid-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Machines</h2>
          <button
            onClick={() => setShowAddMachine(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add machine
          </button>
        </div>
        {machines.length === 0 ? (
          <p className="text-gray-500 py-4">
            No machines linked to this customer. Add machines from the Machines page and link them to this customer.
          </p>
        ) : (
          <div className="space-y-2">
            {machines.map((machine) => {
              const modelDisplay = machine.model
                ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim()
                : 'No model';
              return (
                <div
                  key={machine.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-red-100 transition-colors flex items-center gap-2">
                      <Printer className="h-5 w-5 text-gray-600 group-hover:text-red-600" />
                      <MeterBlocks isColour={machine.model?.modelType === 'colour'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{machine.machineSerialNumber}</p>
                        {machine.nearEndOfLife && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                            title={`Near end of life (${machine.lifePercentUsed}% of ${machine.model?.machineLife?.toLocaleString()} lifespan)`}
                          >
                            <AlertCircle className="h-3 w-3" />
                            Near end of life
                          </span>
                        )}
                        {partsDueByMachine[machine.id]?.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                            title={partsDueByMachine[machine.id]
                              .map((p) => `${p.partName}: ${p.usage.toLocaleString()} / ${p.expectedYield.toLocaleString()} clicks (${p.percentUsed}% of yield)`)
                              .join('\n')}
                          >
                            <span className="flex items-center gap-0.5">
                              {partsDueByMachine[machine.id].map((p, i) => (
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
                            Toner due
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{modelDisplay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/machines?edit=${machine.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit machine"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <Link
                      to={`/consumables/machines/${machine.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Order consumables"
                    >
                      <Package className="h-4 w-4" />
                      Order consumables
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
