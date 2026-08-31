import { Outlet } from "react-router-dom";
import DoctorNavbar from "../components/Doctor/DoctorNavbar";

const DoctorLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>
      <DoctorNavbar />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;
