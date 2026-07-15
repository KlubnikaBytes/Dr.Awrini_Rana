import AdminServicesToolbar from "../components/AdminServicesToolbar";
import AdminServicesTable from "../components/AdminServicesTable";

import "../styles/admin-services.css";

function AdminServices() {
  return (
    <div className="admin-page">

      <div className="admin-container">

        <AdminServicesToolbar />

        <AdminServicesTable />

      </div>

    </div>
  );
}

export default AdminServices;