import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import TenantPage from "./pages/TenantPage";
import ApartmentPage from "./pages/ApartmentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:tenantSlug" element={<TenantPage />} />
      <Route path="/:tenantSlug/:apartmentSlug" element={<ApartmentPage />} />
    </Routes>
  );
}
