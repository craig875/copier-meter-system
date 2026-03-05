import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi, consumablesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Building2, Printer, AlertTriangle, Plus, AlertCircle } from 'lucide-react';
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
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Customers
        </Link>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((machine) => {
              const modelDisplay = machine.model
                ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim()
                : 'No model';
              const hasBadges = machine.nearEndOfLife || (partsDueByMachine[machine.id]?.length > 0);
              return (
                <Link
                  key={machine.id}
                  to={`/consumables/machines/${machine.id}`}
                  className="tile-card flex p-4 group min-h-[100px]"
                >
                  {(hasBadges) && (
                    <div className="flex flex-col items-center justify-center w-12 flex-shrink-0 pr-4 border-r border-gray-200 gap-1">
                      {machine.nearEndOfLife && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                          title={`Near end of life (${machine.lifePercentUsed}% of ${machine.model?.machineLife?.toLocaleString()} life cycle)`}
                        >
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                      {partsDueByMachine[machine.id]?.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                          title={partsDueByMachine[machine.id]
                            .map((p) => `${p.partName}: ${p.usage.toLocaleString()} / ${p.expectedYield.toLocaleString()} clicks (${p.percentUsed}% of yield)`)
                            .join('\n')}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {partsDueByMachine[machine.id].length}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 flex flex-col ${hasBadges ? 'pl-4' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                        <Printer className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
                        <MeterBlocks isColour={machine.model?.modelType === 'colour'} />
                      </div>
                      <p className="font-medium text-gray-900 truncate">{machine.machineSerialNumber}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 truncate">{modelDisplay}</p>
                  </div>
                </Link>
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
