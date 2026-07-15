import {
  Calendar3,
  People,
  CameraVideoFill,
  Sliders,
  PersonPlus,
  PersonWorkspace,
  Bell,
  Grid3x3GapFill,
  ChevronDown,
  Search
} from "react-bootstrap-icons";

import doctor from "../assets/doctor.png";
import frontdesk from "../assets/frontdesk.png";
import admin from "../assets/admin.png";
import lab from "../assets/lab.png";
import ipd from "../assets/ipd.png";
import reports from "../assets/reports.png";
import pharmacy from "../assets/pharmacy.png";
import robin from "../assets/robin.png";

import logo from "../assets/logo.png";
import { NavLink , useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

function Navbar() {

  const [showOptions, setShowOptions] = useState(false);

  const menuRef = useRef(null);

  const [showApps, setShowApps] = useState(false);

 const appsRef = useRef(null);

 const navigate = useNavigate();

  useEffect(() => {

  const handler = (e) => {

    if (
      menuRef.current &&
      !menuRef.current.contains(e.target)
    ) {
      setShowOptions(false);
    }

    if (
      appsRef.current &&
      !appsRef.current.contains(e.target)
    ) {
      setShowApps(false);
    }

  };

  document.addEventListener("mousedown", handler);

  return () => {
    document.removeEventListener("mousedown", handler);
  };

}, []);

  return (

    <nav className="hp-navbar">

      <div className="hp-left">

        <img src={logo} className="hp-logo" alt="logo" />

        <NavLink
          to="/appointments"
          className={({ isActive }) =>
            isActive ? "menu active" : "menu"
          }
        >
          <Calendar3 />
          <span>Appointments</span>
        </NavLink>

        <NavLink
          to="/consults"
          className={({ isActive }) =>
            isActive ? "menu active" : "menu"
          }
        >
          <People />
          <span>Consults</span>
        </NavLink>

        <a href="#" className="menu">
          <CameraVideoFill />
          <span>Tele Consults</span>
        </a>

        {/* Options */}

        <div
          className="options-wrapper"
          ref={menuRef}
        >

          <button
            type="button"
            className="menu options-btn"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Sliders />
            <span>Options</span>
            <ChevronDown size={12} />
          </button>

          {showOptions && (

            <div className="options-dropdown">

              <div>Preferences</div>
              <div>Rx Groups</div>
              <div>Custom templates</div>
              <div>Prescription templates</div>
              <div>Medicines Ignored</div>
              <div>Complaints Remembered</div>
              <div>Diagnosis Remembered</div>
              <div>Notes Remembered</div>
              <div>Medicines Library</div>
              <div>Medicines Database</div>
              <div>Custom Translation</div>
              <div>Chat</div>
              {/* <div>Patient Education</div>
              <div>Clinic Settings</div>
              <div>Doctors</div>
              <div>Profile</div>
              <div>Logout</div> */}

            </div>

          )}

        </div>

      </div>

      <div className="hp-right">

        <a href="#" className="menu">
          <PersonPlus />
          <span>New</span>
        </a>

        <div className="search-wrapper">

          <input
            type="text"
            placeholder="Search Patient"
          />

          <Search />

        </div>

        <a href="#" className="menu">
          <PersonWorkspace />
          <span>Support</span>
        </a>

        <Bell className="top-icon" />

       <div className="apps-wrapper" ref={appsRef}>

  <Grid3x3GapFill
    className="top-icon"
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

        <div className="profile-circle">
          <i className="bi bi-person"></i>
        </div>

      </div>

    </nav>

  );
}

export default Navbar;