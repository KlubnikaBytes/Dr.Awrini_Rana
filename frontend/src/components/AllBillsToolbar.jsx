import {
  ArrowClockwise,
  Calendar3,
  List,
  PersonCircle,
  Beaker,
  PlusSquare,
  InfoCircle,
} from "react-bootstrap-icons";

import "../styles/frontdesk-toolbar.css";
import { useNavigate } from "react-router-dom";

function FrontdeskToolbar() {

  const navigate = useNavigate();

  return (
    <div className="fd-toolbar">

      {/* Left */}

      <div className="fd-toolbar-left">

        <button className="circle-btn refresh">
          <ArrowClockwise />
        </button>

        <button className="circle-btn">
          <Calendar3 />
        </button>

        <button className="circle-btn active">
          *
        </button>

        <button className="circle-btn doctor">
          Dr
        </button>

        <input
          className="filter-input"
          placeholder="Filter Name"
        />

      </div>

      {/* Center */}

      <div className="fd-toolbar-center">

        <button className="circle-btn">
          <List />
        </button>

        <button className="circle-btn">
          <PersonCircle />
        </button>

        <button className="circle-btn">
          <Beaker />
        </button>

        <button className="circle-btn">
          <PlusSquare />
        </button>

        <button className="circle-btn">
          <InfoCircle />
        </button>

      </div>

      {/* Right */}

      <div className="fd-toolbar-right">

        <button
          className="tab active"
          onClick={() => navigate("/frontdesk/all-bills")}
        >
          All
        </button>

        <button className="tab">
          Booked
        </button>

        <button className="tab">
          Arrived
        </button>

        <button className="tab">
          On-Going
        </button>

        <button className="tab">
          Reviewed
        </button>

        <input
          type="date"
          className="date-box"
          defaultValue="2026-07-14"
        />

        <button className="small-btn">
          Set
        </button>

        <button className="small-btn">
          Today
        </button>

      </div>

    </div>
  );
}

export default FrontdeskToolbar;