import {
  BellFill,
  Grid3x3GapFill,
  PersonCircle,
  ChevronDown,
} from "react-bootstrap-icons";

import logo from "../assets/logo.png";
import "../styles/admin-navbar.css";
import { NavLink } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import doctor from "../assets/doctor.png";
import frontdesk from "../assets/frontdesk.png";
import admin from "../assets/admin.png";
import lab from "../assets/lab.png";
import ipd from "../assets/ipd.png";
import reports from "../assets/reports.png";
import pharmacy from "../assets/pharmacy.png";
import robin from "../assets/robin.png";

function AdminNavbar() {

  const [showPreferences, setShowPreferences] = useState(false);

  const prefRef = useRef(null);


const [showOther, setShowOther] = useState(false);


const otherRef = useRef(null);

const [showApps, setShowApps] = useState(false);

const appsRef = useRef(null);

const navigate = useNavigate();

 useEffect(() => {

  const handler = (e) => {

    if (
      prefRef.current &&
      !prefRef.current.contains(e.target)
    ) {
      setShowPreferences(false);
    }

    if (
      otherRef.current &&
      !otherRef.current.contains(e.target)
    ) {
      setShowOther(false);
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
    <nav className="admin-navbar">

      <div className="admin-left">

        <img src={logo} className="admin-logo" alt="logo" />

        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive ? "admin-menu active" : "admin-menu"
          }
        >
          Staff
        </NavLink>

        <NavLink
          to="/admin/services"
          className={({ isActive }) =>
            isActive ? "admin-menu active" : "admin-menu"
          }
        >
          Services
        </NavLink>

        {/* Preferences */}

        <div
          className="admin-dropdown-wrapper"
          ref={prefRef}
        >

          <button
            className="admin-menu dropdown-btn"
            onClick={() =>
              setShowPreferences(!showPreferences)
            }
          >
            Preferences
            <ChevronDown size={12}/>
          </button>

          {showPreferences && (

            <div className="admin-dropdown">

              <div>Clinic Preferences</div>

              <div>Bill Preferences</div>

              <div>Pharmacy Preferences</div>

              <div>Lab Preferences</div>

              <div>Department Preferences</div>

              <div>Payer Details</div>

            </div>

          )}

        </div>

        <div
  className="admin-dropdown-wrapper"
  ref={otherRef}
>

  <button
    className="admin-menu dropdown-btn"
    onClick={() => setShowOther(!showOther)}
  >
    Other
    <ChevronDown size={12} />
  </button>

  {showOther && (

    <div className="admin-dropdown">

      <div>Form Templates</div>

      <div>Opthalmic Library</div>

      <div>Compare Branches</div>

      <div>Merge Patients</div>

    </div>

  )}

</div>

      </div>

      <div className="admin-right">

        <BellFill className="admin-icon notification"/>

       <div
  className="apps-wrapper"
  ref={appsRef}
>

  <Grid3x3GapFill
    className="admin-icon"
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

        <div className="admin-profile">
          <PersonCircle/>
        </div>

      </div>

    </nav>
  );
}

export default AdminNavbar;