import AppointmentToolbar from "../components/AppointmentToolbar";
import AppointmentTable from "../components/AppointmentTable";
import PlixBoard from "../components/PlixBoard";
import "../styles/appointment.css";

function Appointments() {
  return (
    <>
      <AppointmentToolbar />

      <div className="appointment-page">

        <div className="appointment-left">

          <AppointmentTable />

        </div>

        <div className="appointment-right">

          <PlixBoard />

        </div>

      </div>
    </>
  );
}

export default Appointments;