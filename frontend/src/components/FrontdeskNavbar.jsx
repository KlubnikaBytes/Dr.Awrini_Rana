import {
  CardChecklist,
  Clipboard2Plus,
  People,
  CameraVideoFill,
  PersonPlus,
  Search,
  PersonWorkspace,
  Bell,
  Grid3x3GapFill,
} from "react-bootstrap-icons";

import logo from "../assets/logo.png";
import "../styles/frontdesk-navbar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import doctor from "../assets/doctor.png";
import frontdesk from "../assets/frontdesk.png";
import admin from "../assets/admin.png";
import lab from "../assets/lab.png";
import ipd from "../assets/ipd.png";
import reports from "../assets/reports.png";
import pharmacy from "../assets/pharmacy.png";
import robin from "../assets/robin.png";

function FrontdeskNavbar() {

  const navigate = useNavigate();

  const [showApps, setShowApps] = useState(false);

  const appsRef = useRef(null);

useEffect(() => {

  const handler = (e) => {

    if (
      appsRef.current &&
      !appsRef.current.contains(e.target)
    ) {
      setShowApps(false);
    }

  };

  document.addEventListener("mousedown", handler);

  return () =>
    document.removeEventListener("mousedown", handler);

}, []);

  return (
    <nav className="fd-navbar">

      <div className="fd-left">

        <img src={logo} className="fd-logo" alt="logo" />

        <NavLink
  to="/frontdesk/all-bills"
  className={({ isActive }) =>
    isActive ? "fd-menu active" : "fd-menu"
  }
>
  <CardChecklist />
  <span>All Bills</span>
</NavLink>

       <NavLink
  to="/frontdesk/add-services"
  className={({ isActive }) =>
    isActive ? "fd-menu active" : "fd-menu"
  }
>
  <Clipboard2Plus />
  <span>Add Services</span>
</NavLink>

       <NavLink
  to="/frontdesk/patient-q"
  className={({ isActive }) =>
    isActive ? "fd-menu active" : "fd-menu"
  }
>
  <People />
  <span>Patient Q</span>
</NavLink>

        <a href="#" className="fd-menu">
          <CameraVideoFill />
          <span>Tele Consults</span>
        </a>

      </div>

      <div className="fd-right">

        <a href="#" className="fd-menu">
          <PersonPlus />
          <span>New</span>
        </a>

        <div className="fd-search">

          <input
            type="text"
            placeholder="Search Patient"
          />

          <Search />

        </div>

        <a href="#" className="fd-menu">
          <PersonWorkspace />
          <span>Support</span>
        </a>

        <Bell className="fd-icon" />

       <div className="apps-wrapper" ref={appsRef}>

  <Grid3x3GapFill
    className="fd-icon"
    onClick={() => setShowApps(!showApps)}
  />

  {showApps && (

    <div className="apps-dropdown">

      <div
        className="app-card"
        onClick={() => {
          setShowApps(false);
          navigate("/");
        }}
      >
        <img src={doctor} alt="" />
        <span>Doctor</span>
      </div>

      <div
        className="app-card"
        onClick={() => {
          setShowApps(false);
          navigate("/frontdesk");
        }}
      >
        <img src={frontdesk} alt="" />
        <span>Frontdesk</span>
      </div>

       <div
             className="app-card"
             onClick={() => {
               setShowApps(false);
               navigate("/admin");
             }}
           >
             <img src={admin} alt="" />
             <span>Admin</span>
           </div>
       <div
          className="app-card"
          onClick={()=>{
              setShowApps(false);
              navigate("/lab");
          }}
      >
          <img src={lab} alt="" />
          <span>Lab</span>
      </div>


      <div className="app-card">
        <img src={ipd} alt="" />
        <span>IPD</span>
      </div>

        <div
          className="app-card"
          onClick={()=>{
              setShowApps(false);
              navigate("/reports");
          }}
      >
          <img src={reports} alt="" />
          <span>Reports</span>
      </div>

      <div className="app-card">
        <img src={pharmacy} alt="" />
        <span>Pharmacy</span>
      </div>

      <div className="app-card">
        <img src={robin} alt="" />
        <span>Robin</span>
      </div>

    </div>

  )}

</div>

        <div className="fd-profile">
          <i className="bi bi-person"></i>
        </div>

      </div>

    </nav>
  );
}

export default FrontdeskNavbar;