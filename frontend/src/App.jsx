import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CapturerRestrict from './components/CapturerRestrict';
import Layout from './components/Layout';
import Login from './pages/Login';
import HomeDashboard from './pages/HomeDashboard';
import Dashboard from './pages/Dashboard';
import Capture from './pages/Capture';
import History from './pages/History';
import Machines from './pages/Machines';
import Users from './pages/Users';
import ImportReadings from './pages/ImportReadings';
import TransactionHistory from './pages/TransactionHistory';
import ConsumablesSummary from './pages/ConsumablesSummary';
import ConsumableMachineDetail from './pages/ConsumableMachineDetail';
import MachineReadingsHistory from './pages/MachineReadingsHistory';
import MachineConfiguration from './pages/MachineConfiguration';
import PartsPricing from './pages/PartsPricing';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CopierServiceDashboard from './pages/CopierServiceDashboard';
import Notifications from './pages/Notifications';
import SecuritySettings from './pages/SecuritySettings';
import ConnectivityDashboard from './pages/ConnectivityDashboard';
import ConnectivityTargets from './pages/ConnectivityTargets';
import ConnectivityTargetDetail from './pages/ConnectivityTargetDetail';
import ConnectivityTargetForm from './pages/ConnectivityTargetForm';
import ConnectivityTimeWindows from './pages/ConnectivityTimeWindows';
import ConnectivityReports from './pages/ConnectivityReports';
import ConnectivityOutages from './pages/ConnectivityOutages';
import FibreOrdersDashboard from './pages/FibreOrdersDashboard';
import FibreOrdersList from './pages/FibreOrdersList';
import FibreOrdersCompleted from './pages/FibreOrdersCompleted';
import FibreOrderDetail from './pages/FibreOrderDetail';
import FibreOrderForm from './pages/FibreOrderForm';
import FibreProducts from './pages/FibreProducts';
import UnableToObtainOverrides from './pages/admin/UnableToObtainOverrides';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* Main Dashboard - Shows available modules */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HomeDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Meter Readings Module Routes */}
      <Route
        path="/meter-readings"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/capture"
        element={
          <ProtectedRoute>
            <Layout>
              <Capture />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <History />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/machines"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <Machines />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />

      {/* Copier Service Dashboard */}
      <Route
        path="/copier-service"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <CopierServiceDashboard />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />

      {/* Consumables Module Routes */}
      <Route
        path="/consumables"
        element={<Navigate to="/consumables/summary" replace />}
      />
      <Route
        path="/consumables/orders"
        element={<Navigate to="/customers" replace />}
      />
      <Route
        path="/consumables/summary"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <ConsumablesSummary />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consumables/machines/:machineId"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <ConsumableMachineDetail />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consumables/machines/:machineId/readings"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <MachineReadingsHistory />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consumables/model-parts"
        element={<Navigate to="/admin/machine-configuration" replace />}
      />

      {/* Admin Tools */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <MachineConfiguration />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/parts-pricing"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <PartsPricing />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/machine-configuration"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <MachineConfiguration />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/unable-to-obtain-overrides"
        element={
          <ProtectedRoute strictAdminOnly>
            <Layout>
              <UnableToObtainOverrides />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/import-readings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ImportReadings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <Customers />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:customerId"
        element={
          <ProtectedRoute>
            <CapturerRestrict>
              <Layout>
                <CustomerDetail />
              </Layout>
            </CapturerRestrict>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-history"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <TransactionHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <Layout>
              <SecuritySettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Connectivity Monitoring Module */}
      <Route path="/connectivity" element={<ProtectedRoute><Layout><ConnectivityDashboard /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/targets" element={<ProtectedRoute><Layout><ConnectivityTargets /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/targets/new" element={<ProtectedRoute><Layout><ConnectivityTargetForm /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/targets/:id/edit" element={<ProtectedRoute><Layout><ConnectivityTargetForm /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/targets/:id" element={<ProtectedRoute><Layout><ConnectivityTargetDetail /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/time-windows" element={<ProtectedRoute><Layout><ConnectivityTimeWindows /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/reports" element={<ProtectedRoute><Layout><ConnectivityReports /></Layout></ProtectedRoute>} />
      <Route path="/connectivity/outages" element={<ProtectedRoute><Layout><ConnectivityOutages /></Layout></ProtectedRoute>} />

      {/* Fibre Orders Module */}
      <Route path="/fibre-orders" element={<ProtectedRoute><Layout><FibreOrdersDashboard /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/list" element={<ProtectedRoute><Layout><FibreOrdersList /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/completed" element={<ProtectedRoute><Layout><FibreOrdersCompleted /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/new" element={<ProtectedRoute adminOnly><Layout><FibreOrderForm /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/products" element={<ProtectedRoute adminOnly><Layout><FibreProducts /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/:id/edit" element={<ProtectedRoute adminOnly><Layout><FibreOrderForm /></Layout></ProtectedRoute>} />
      <Route path="/fibre-orders/:id" element={<ProtectedRoute><Layout><FibreOrderDetail /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
