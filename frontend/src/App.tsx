import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './store/authStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import VendorDetails from './pages/VendorDetails';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import CreateOrder from './pages/CreateOrder';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

// Warehouse module
import Warehouse from './pages/Warehouse';
import WarehouseDetails from './pages/WarehouseDetails';
import WarehouseProducts from './pages/WarehouseProducts';
import ProductDetails from './pages/ProductDetails';
import WarehouseTasks from './pages/WarehouseTasks';
import WarehouseMovements from './pages/WarehouseMovements';

// Settings pages
import ExpenseTemplates from './pages/ExpenseTemplates';

// Layout
import Layout from './components/Layout';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/:id" element={<VendorDetails />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<CreateOrder />} />
        <Route path="orders/:id" element={<OrderDetails />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/expense-templates" element={<ExpenseTemplates />} />
        
        {/* Warehouse module - specific routes before dynamic :id */}
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="warehouse/products" element={<WarehouseProducts />} />
        <Route path="warehouse/products/:id" element={<ProductDetails />} />
        <Route path="warehouse/tasks" element={<WarehouseTasks />} />
        <Route path="warehouse/movements" element={<WarehouseMovements />} />
        <Route path="warehouse/:id" element={<WarehouseDetails />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
