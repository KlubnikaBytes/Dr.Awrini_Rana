import { Outlet } from "react-router-dom";
import ReportsNavbar from "../components/ReportsNavbar";

function ReportsLayout() {
  return (
    <>
      <ReportsNavbar />
      <Outlet />
    </>
  );
}

export default ReportsLayout;