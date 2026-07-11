import { useNavigate } from 'react-router-dom';
import { CheckCircle, Globe, X } from 'lucide-react';
import {
  fibreOrderToConnectivityPrefill,
  dismissConnectivityPrompt,
} from '../../utils/fibreOrderConnectivity';
import { mergeNavigationState } from '../../utils/navigationFrom';

export default function FibreOrderCompleteModal({
  order,
  canAddConnectivity,
  onClose,
}) {
  const navigate = useNavigate();

  if (!order) return null;

  const handleAddMonitoring = () => {
    dismissConnectivityPrompt(order.id);
    const prefill = fibreOrderToConnectivityPrefill(order);
    onClose();
    navigate('/connectivity/targets/new', {
      state: mergeNavigationState(
        { pathname: `/fibre-orders/${order.id}`, search: '', hash: '' },
        { fromFibreOrder: prefill }
      ),
    });
  };

  const handleDismiss = () => {
    dismissConnectivityPrompt(order.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Order complete</h2>
              <p className="text-sm text-gray-500 mt-0.5">{order.customerName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            This fibre order is now marked as <strong>Complete</strong>. The installation workflow is finished.
          </p>

          {canAddConnectivity ? (
            <>
              <p className="text-sm text-gray-600">
                Would you like to add this site to <strong>Connectivity Monitoring</strong>? We&apos;ll open the
                target form with customer and site details pre-filled — you only need to enter the IP or hostname.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddMonitoring}
                  className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Globe className="h-4 w-4" />
                  Add to Connectivity Monitoring
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Contact an administrator if this site should be added to connectivity monitoring.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
