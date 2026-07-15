import {
  PersonPlusFill,
  Search,
  BellFill,
  Grid3x3GapFill,
  TrophyFill,
  PersonCircle,
  ChevronDown,
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

import { PersonWorkspace } from "react-bootstrap-icons";
import "../styles/lab-navbar.css";

function LabNavbar() {

  const navigate = useNavigate();

  const [showApps, setShowApps] = useState(false);
  const appsRef = useRef(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const adminRef = useRef(null);

  useEffect(() => {

    const handler = (e) => {

      if (
        appsRef.current &&
        !appsRef.current.contains(e.target)
      ) {
        setShowApps(false);
      }

      if (
        adminRef.current &&
        !adminRef.current.contains(e.target)
      ) {
        setShowAdmin(false);
      }

    };

    document.addEventListener("mousedown", handler);

    return () =>
      document.removeEventListener("mousedown", handler);

  }, []);

  return (

    <nav className="lab-navbar">

      <div className="lab-left">

        <img
          src={logo}
          className="lab-logo"
          alt=""
        />

        <NavLink
          to="/lab"
          end
          className={({isActive}) =>
            isActive ? "lab-menu active" : "lab-menu"
          }
        >
          Tests
        </NavLink>

        <NavLink
    to="/lab/find-reports"
    className={({ isActive }) =>
        isActive ? "lab-menu active" : "lab-menu"
    }
>
    Find Reports
</NavLink>

       <div
  className="lab-dropdown-wrapper"
  ref={adminRef}
>
  <button
    className={`lab-menu dropdown-btn ${showAdmin ? "open" : ""}`}
    onClick={() => setShowAdmin(!showAdmin)}
  >
    Lab Admin
    <ChevronDown size={12} />
  </button>

  {showAdmin && (
    <div className="lab-dropdown">

      <div className="lab-dropdown-item">
        Lab Templates
      </div>

      <div className="lab-dropdown-item">
        Re-Order Lab Template
      </div>

      <div className="lab-dropdown-item">
        Add Tests
      </div>

      <div className="lab-dropdown-item">
        Re-Order Tests
      </div>

      <div className="lab-dropdown-item">
        Opthal Examination
      </div>

      <div className="lab-dropdown-item">
        Lab Preference
      </div>

    </div>
  )}
</div>

       <NavLink
    to="/lab/services"
    className={({ isActive }) =>
        isActive ? "lab-menu active" : "lab-menu"
    }
>
    Services
</NavLink>

      </div>

      <div className="lab-right">

        <PersonPlusFill className="lab-icon"/>

        <div className="lab-search">

          <input
            placeholder="Search Patient"
          />

          <Search/>

        </div>

        <div className="lab-support">

    <PersonWorkspace className="lab-icon"/>

    <span>Support</span>

</div>

        <BellFill className="lab-icon"/>

        <div
          className="apps-wrapper"
          ref={appsRef}
        >

          <Grid3x3GapFill
            className="lab-icon"
            onClick={() =>
              setShowApps(!showApps)
            }
          />

          {showApps && (

            <div className="apps-dropdown">

              <div
                className="app-card"
                onClick={()=>{
                  navigate("/");
                  setShowApps(false);
                }}
              >
                <img src={doctor} alt=""/>
                <span>Doctor</span>
              </div>

              <div
                className="app-card"
                onClick={()=>{
                  navigate("/frontdesk");
                  setShowApps(false);
                }}
              >
                <img src={frontdesk} alt=""/>
                <span>Frontdesk</span>
              </div>

              <div
                className="app-card"
                onClick={()=>{
                  navigate("/admin");
                  setShowApps(false);
                }}
              >
                <img src={admin} alt=""/>
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
                <img src={ipd} alt=""/>
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
                <img src={pharmacy} alt=""/>
                <span>Pharmacy</span>
              </div>

              <div className="app-card">
                <img src={robin} alt=""/>
                <span>Robin</span>
              </div>

            </div>

          )}

        </div>

        <div className="trophy-circle">
          <TrophyFill/>
        </div>

        <div className="profile-circle">
          <PersonCircle/>
        </div>

      </div>

    </nav>

  );

}

export default LabNavbar;