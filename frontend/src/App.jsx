import { Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import FrontdeskLayout from "./layouts/FrontdeskLayout";
import AdminLayout from "./layouts/AdminLayout";
import LabLayout from "./layouts/LabLayout";
import ReportsLayout from "./layouts/ReportsLayout";


import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Consults from "./pages/Consults";
import TeleConsults from "./pages/TeleConsults";
import Reports from "./pages/Reports";

import FrontdeskDashboard from "./pages/FrontdeskDashboard";
import AllBills from "./pages/AllBills";
import AddServices from "./pages/AddServices";
import PatientQ from "./pages/PatientQ";

import AdminDashboard from "./pages/AdminDashboard";
import AdminServices from "./pages/AdminServices";

import LabDashboard from "./pages/LabDashboard";
import LabFindReports from "./pages/LabFindReports";
import LabServices from "./pages/LabServices";

import ReportsDashboard from "./pages/ReportsDashboard";

function App() {
  return (
    <Routes>
      {/* Doctor Module */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="consults" element={<Consults />} />
        <Route path="teleconsults" element={<TeleConsults />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Frontdesk Module */}
      <Route path="/frontdesk" element={<FrontdeskLayout />}>
        <Route
          index
          element={<FrontdeskDashboard />}
        />

        <Route
          path="all-bills"
          element={<AllBills />}
        />

        <Route
          path="add-services"
          element={<AddServices />}
        />

        <Route
  path="patient-q"
  element={<PatientQ />}
/>
      </Route>

      <Route path="/admin" element={<AdminLayout />}>

    <Route
        index
        element={<AdminDashboard />}
    />

      <Route
        path="services"
        element={<AdminServices />}
    />

</Route>

<Route
    path="/lab"
    element={<LabLayout />}
>
    <Route
        index
        element={<LabDashboard />}
    />

    <Route
    path="find-reports"
    element={<LabFindReports />}
/>

<Route
    path="services"
    element={<LabServices />}
/>
</Route>

<Route
    path="/reports"
    element={<ReportsLayout />}
>
    <Route
        index
        element={<ReportsDashboard />}
    />
</Route>

    </Routes>
  );
}

export default App;