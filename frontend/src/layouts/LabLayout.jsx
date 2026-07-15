import { Outlet } from "react-router-dom";
import LabNavbar from "../components/LabNavbar";

function LabLayout() {
  return (
    <>
      <LabNavbar />
      <Outlet />
    </>
  );
}

export default LabLayout;