import TopToolbar from "../components/TopToolbar";
import AppointmentGrid from "../components/AppointmentGrid";
import BulkMessage from "../components/BulkMessage";

function Dashboard() {
  return (
    <>
      <TopToolbar />

      <div className="dashboard-wrapper">

        <div className="left-panel">
          <AppointmentGrid />
        </div>

        <div className="right-panel">
          <BulkMessage />
        </div>

      </div>
    </>
  );
}

export default Dashboard;