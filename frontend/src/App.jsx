import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import AddServicesPage from "./pages/AddServices/AddServicesPage";
import PatientQ from "./pages/PatientQ";

import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";
import AdminStaffPage from "./pages/Admin/AdminStaffPage";

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/patient-q" element={<PatientQ />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="add-services" element={<AddServicesPage />} />
          <Route path="teleconsults" element={<Dashboard />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="staff" replace />} />
          <Route path="staff/*" element={<AdminStaffPage />} />
          <Route path="services" element={<div className="p-3">Services content</div>} />
          <Route path="preferences" element={<div className="p-3">Preferences content</div>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;