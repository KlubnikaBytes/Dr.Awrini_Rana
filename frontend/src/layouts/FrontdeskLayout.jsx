import { Outlet } from "react-router-dom";
import FrontdeskNavbar from "../components/FrontdeskNavbar";

function FrontdeskLayout() {
  return (
    <>
      <FrontdeskNavbar />
      <Outlet />
    </>
  );
}

export default FrontdeskLayout;