import { Routes, Route, Navigate } from "react-router-dom";
import { ApexGuard } from "./components/ApexGuard";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Hosts from "./pages/Hosts";
import HostViewLayout from "./pages/HostViewLayout";
import HostManageLayout from "./pages/HostManageLayout";
import HostConfigPage from "./pages/HostConfigPage";
import ApexApartmentEdit from "./pages/ApexApartmentEdit";
import HostForm from "./pages/HostForm";
import Users from "./pages/Users";
import Apartments from "./pages/Apartments";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ApexGuard>
            <DashboardLayout />
          </ApexGuard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="hosts" element={<Hosts />} />
        <Route path="hosts/new" element={<HostForm />} />

        {/* View mode (readonly) */}
        <Route path="hosts/:hostId" element={<HostViewLayout />}>
          <Route index element={<HostConfigPage />} />
          <Route path="apartments/:slug" element={<ApexApartmentEdit />} />
        </Route>

        {/* Edit mode (with security gate) */}
        <Route path="hosts/:hostId/edit" element={<HostManageLayout />}>
          <Route index element={<HostConfigPage />} />
          <Route path="apartments/:slug" element={<ApexApartmentEdit />} />
        </Route>

        <Route path="users" element={<Users />} />
        <Route path="apartments" element={<Apartments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
