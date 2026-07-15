import {
  Search,
  Calendar3
} from "react-bootstrap-icons";

function AppointmentToolbar() {
  return (
    <div className="appointment-toolbar">

      {/* Left */}
      <div className="toolbar-search">

        <Search size={22} />

        <input
          type="text"
          placeholder="Search"
        />

      </div>

      {/* Center */}
      <div className="toolbar-center">

        <div className="count-box">
          <span>Pending:</span>
          <strong>5</strong>
        </div>

        <div className="count-box">
          <span>Completed:</span>
          <strong>11</strong>
        </div>

        <button className="details-btn">
          Details
        </button>

      </div>

      {/* Right */}
      <div className="toolbar-right-side">

        <button className="date-picker">

          <Calendar3 size={20} />

          <span>13-Jul-2026</span>

        </button>

        <button className="small-btn">
          Set
        </button>

        <button className="small-btn">
          Today
        </button>

        <button className="small-btn">
          Refresh
        </button>

      </div>

    </div>
  );
}

export default AppointmentToolbar;