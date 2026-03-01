import { Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Apartments from "./pages/Apartments";
import ApartmentEdit from "./pages/ApartmentEdit";
import Bookings from "./pages/Bookings";
import Seasons from "./pages/Seasons";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="apartments" element={<Apartments />} />
        <Route path="apartments/:slug" element={<ApartmentEdit />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="seasons" element={<Seasons />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
