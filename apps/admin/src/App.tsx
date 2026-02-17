import { Routes, Route, Navigate } from "react-router-dom";
import { AdminGuard } from "./components/AdminGuard";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantViewLayout from "./pages/TenantViewLayout";
import TenantManageLayout from "./pages/TenantManageLayout";
import TenantConfigPage from "./pages/TenantConfigPage";
import AdminApartmentEdit from "./pages/AdminApartmentEdit";
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

        {/* View mode (readonly) */}
        <Route path="tenants/:tenantId" element={<TenantViewLayout />}>
          <Route index element={<TenantConfigPage />} />
          <Route path="apartments/:slug" element={<AdminApartmentEdit />} />
        </Route>

        {/* Edit mode (with security gate) */}
        <Route path="tenants/:tenantId/edit" element={<TenantManageLayout />}>
          <Route index element={<TenantConfigPage />} />
          <Route path="apartments/:slug" element={<AdminApartmentEdit />} />
        </Route>

        <Route path="users" element={<Users />} />
        <Route path="apartments" element={<Apartments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
