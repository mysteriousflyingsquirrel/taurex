import { Routes, Route, Navigate } from "react-router-dom";
import { AdminGuard } from "./components/AdminGuard";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import TenantForm from "./pages/TenantForm";
import Users from "./pages/Users";
import Apartments from "./pages/Apartments";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AdminGuard>
            <DashboardLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="tenants/new" element={<TenantForm />} />
        <Route path="tenants/:tenantId" element={<TenantDetail />} />
        <Route path="tenants/:tenantId/edit" element={<TenantForm />} />
        <Route path="users" element={<Users />} />
        <Route path="apartments" element={<Apartments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
