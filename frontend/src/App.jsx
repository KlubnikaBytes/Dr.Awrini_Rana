import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import AddServicesPage from "./pages/AddServices/AddServicesPage";
import PatientQ from "./pages/PatientQ";

import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import SelectClinic from "./pages/Auth/SelectClinic";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";
import AdminStaffPage from "./pages/Admin/AdminStaffPage";
import AdminClinicsPage from "./pages/Admin/AdminClinicsPage";

import DoctorLayout from "./layouts/DoctorLayout";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import VisitPad from "./pages/Doctor/VisitPad";

import PrintPrescription from "./pages/Doctor/PrintPrescription";
import HomeCarePage from "./pages/HomeCare/HomeCarePage";
import DayCarePage from "./pages/DayCare/DayCarePage";
import LabPage from "./pages/Lab/LabPage";
import ReportsPage from "./pages/Reports/ReportsPage";

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
        <Route element={<AuthLayout />}>
          <Route path="/select-clinic" element={<SelectClinic />} />
        </Route>

        <Route path="/patient-q" element={<PatientQ />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="add-services" element={<AddServicesPage />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor/visit/:appointmentId/print" element={<PrintPrescription />} />
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="consults" element={<div className="p-3">Consults Page</div>} />
          <Route path="visit/:appointmentId" element={<VisitPad />} />
        </Route>

        {/* Home Care Route */}
        <Route path="/home-care" element={<HomeCarePage />} />

        {/* Day Care Route */}
        <Route path="/day-care" element={<DayCarePage />} />

        {/* Lab Route */}
        <Route path="/lab" element={<LabPage />} />

        {/* Reports Route */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="staff" replace />} />
          <Route path="staff/*" element={<AdminStaffPage />} />
          <Route path="clinics" element={<AdminClinicsPage />} />
          <Route path="services" element={
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Services</h4>
              </div>
              <div className="bg-white rounded shadow-sm p-5 text-center text-muted">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏥</div>
                <h5 className="fw-bold">Services Management</h5>
                <p className="mb-0">Service catalog management is not yet configured for this clinic. Please contact support to enable this feature.</p>
              </div>
            </div>
          } />
          <Route path="preferences" element={
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Preferences</h4>
              </div>
              <div className="bg-white rounded shadow-sm p-4">
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="p-3 border rounded">
                      <div className="fw-bold mb-2">🌐 Language</div>
                      <select className="form-select form-select-sm"><option>English</option><option>Hindi</option></select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 border rounded">
                      <div className="fw-bold mb-2">🕐 Timezone</div>
                      <select className="form-select form-select-sm"><option>Asia/Kolkata (IST)</option><option>UTC</option></select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                      <div><div className="fw-bold">🔔 Notifications</div><div className="small text-muted">Email alerts for appointments</div></div>
                      <div className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" role="switch" defaultChecked /></div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                      <div><div className="fw-bold">📱 SMS Alerts</div><div className="small text-muted">Send SMS to patients</div></div>
                      <div className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" role="switch" /></div>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-end mt-4">
                  <button className="btn btn-primary px-4" onClick={() => alert('Preferences saved!')}>Save Preferences</button>
                </div>
              </div>
            </div>
          } />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;