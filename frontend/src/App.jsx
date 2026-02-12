import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import MachineConfiguration from './pages/MachineConfiguration';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import ConsumableOrders from './pages/ConsumableOrders';
import CopierServiceDashboard from './pages/CopierServiceDashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            <Layout>
              <Machines />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Copier Service Dashboard */}
      <Route
        path="/copier-service"
        element={
          <ProtectedRoute>
            <Layout>
              <CopierServiceDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Consumables Module Routes */}
      <Route
        path="/consumables"
        element={<Navigate to="/consumables/orders" replace />}
      />
      <Route
        path="/consumables/orders"
        element={
          <ProtectedRoute>
            <Layout>
              <ConsumableOrders />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consumables/summary"
        element={
          <ProtectedRoute>
            <Layout>
              <ConsumablesSummary />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consumables/machines/:machineId"
        element={
          <ProtectedRoute>
            <Layout>
              <ConsumableMachineDetail />
            </Layout>
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
        path="/admin/machine-configuration"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <MachineConfiguration />
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
            <Layout>
              <Customers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:customerId"
        element={
          <ProtectedRoute>
            <Layout>
              <CustomerDetail />
            </Layout>
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
