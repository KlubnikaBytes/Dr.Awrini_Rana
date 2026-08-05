import { Outlet } from "react-router-dom";
import DoctorNavbar from "../components/Doctor/DoctorNavbar";

const DoctorLayout = () => {
  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <DoctorNavbar />
      <div className="flex-grow-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;
