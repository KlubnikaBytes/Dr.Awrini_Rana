import {
  ChevronDown,
  Grid3x3GapFill,
  PersonCircle,
  PersonWorkspace,
} from "react-bootstrap-icons";

import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import logo from "../assets/logo.png";

import doctor from "../assets/doctor.png";
import frontdesk from "../assets/frontdesk.png";
import admin from "../assets/admin.png";
import lab from "../assets/lab.png";
import ipd from "../assets/ipd.png";
import reports from "../assets/reports.png";
import pharmacy from "../assets/pharmacy.png";
import robin from "../assets/robin.png";

import "../styles/reports-navbar.css";

function ReportsNavbar() {
  const navigate = useNavigate();

  const [showApps, setShowApps] = useState(false);

  const appsRef = useRef(null);

  const [showFrontdesk, setShowFrontdesk] = useState(false);

  const frontdeskRef = useRef(null);

  const [showDoctor, setShowDoctor] = useState(false);

  const doctorRef = useRef(null);

  const [showClinical, setShowClinical] = useState(false);

  const clinicalRef = useRef(null);

useEffect(() => {

  const handler = (e) => {

    if (
      appsRef.current &&
      !appsRef.current.contains(e.target)
    ) {
      setShowApps(false);
    }

    if (
      frontdeskRef.current &&
      !frontdeskRef.current.contains(e.target)
    ) {
      setShowFrontdesk(false);
    }

    if (
      doctorRef.current &&
      !doctorRef.current.contains(e.target)
    ) {
      setShowDoctor(false);
    }

    if (
      clinicalRef.current &&
      !clinicalRef.current.contains(e.target)
    ) {
      setShowClinical(false);
    }

  };

  document.addEventListener("mousedown", handler);

  return () =>
    document.removeEventListener("mousedown", handler);

}, []);

  return (
    <nav className="reports-navbar">
      <div className="reports-left">

        <img
          src={logo}
          alt="logo"
          className="reports-logo"
        />

       <div
  className="reports-dropdown-wrapper"
  ref={frontdeskRef}
>

  <button
    className={`reports-menu ${showFrontdesk ? "open" : ""}`}
    onClick={() =>
      setShowFrontdesk(!showFrontdesk)
    }
  >
    Frontdesk
    <ChevronDown size={12} />
  </button>

  {showFrontdesk && (

    <div className="reports-dropdown">

      <div>Bill Report</div>

      <div>Bill Report Detailed</div>

      <div>All Appointments</div>

      <div>View Upcoming Appointments</div>

      <div>View Advised Visits</div>

      <div>View Services</div>

      <div>View Missed Visits</div>

      <div>View Service Collections</div>

      <div>TAT Report</div>

    </div>

  )}

</div>
        <div
  className="reports-dropdown-wrapper"
  ref={doctorRef}
>

  <button
    className={`reports-menu ${showDoctor ? "open" : ""}`}
    onClick={() =>
      setShowDoctor(!showDoctor)
    }
  >
    Doctor
    <ChevronDown size={12} />
  </button>

  {showDoctor && (

    <div className="reports-dropdown">

      <div>Consultation Report</div>

      <div>Prescription Report</div>

      <div>Diagnosis Report</div>

      <div>Tests Distribution</div>

      <div>Tests Outcome</div>

      <div>Chat Report</div>

      <div>Online Consultation Report</div>

      <div>Online Consultation Branch Report</div>

      <div>In-Person Consultation Report</div>

      <div>In-Person Consultation Branch Report</div>

      <div>Failed Test Advised</div>

    </div>

  )}

</div>

       <div
  className="reports-dropdown-wrapper"
  ref={clinicalRef}
>

  <button
    className={`reports-menu ${showClinical ? "open" : ""}`}
    onClick={() => {
      setShowClinical(!showClinical);
      setShowFrontdesk(false);
      setShowDoctor(false);
    }}
  >
    Clinical Reports
    <ChevronDown size={12} />
  </button>

  {showClinical && (

    <div className="reports-dropdown">

      <div>Custom Report</div>

    </div>

  )}

</div>

        <NavLink
          to="/reports"
          end
          className={({ isActive }) =>
            isActive
              ? "reports-menu active"
              : "reports-menu"
          }
        >
          Op-Reports
        </NavLink>

      </div>

      <div className="reports-right">

        <PersonWorkspace className="reports-icon" />

        <div
          className="reports-apps-wrapper"
          ref={appsRef}
        >
          <Grid3x3GapFill
            className="reports-icon"
            onClick={() =>
              setShowApps(!showApps)
            }
          />

          {showApps && (
            <div className="reports-apps-dropdown">

              <div
                className="app-card"
                onClick={() => {
                  navigate("/");
                  setShowApps(false);
                }}
              >
                <img src={doctor} alt="" />
                <span>Doctor</span>
              </div>

              <div
                className="app-card"
                onClick={() => {
                  navigate("/frontdesk");
                  setShowApps(false);
                }}
              >
                <img src={frontdesk} alt="" />
                <span>Frontdesk</span>
              </div>

              <div
                className="app-card"
                onClick={() => {
                  navigate("/admin");
                  setShowApps(false);
                }}
              >
                <img src={admin} alt="" />
                <span>Admin</span>
              </div>

              <div
                className="app-card"
                onClick={() => {
                  navigate("/lab");
                  setShowApps(false);
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

        <div className="reports-profile">
          <PersonCircle />
        </div>

      </div>
    </nav>
  );
}

export default ReportsNavbar;