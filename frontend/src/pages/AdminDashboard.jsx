import AdminToolbar from "../components/AdminToolbar";
import StaffList from "../components/StaffList";
import StaffDetails from "../components/StaffDetails";

import "../styles/admin.css";

function AdminDashboard() {
  return (
    <div className="admin-page">

      <div className="admin-container">

        <AdminToolbar />

        <div className="admin-body">
          <StaffList />
          <StaffDetails />
        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;