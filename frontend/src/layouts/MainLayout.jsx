import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Navbar />
      <div className="flex-grow-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
