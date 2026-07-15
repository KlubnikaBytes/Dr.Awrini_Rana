import { Calendar3 } from "react-bootstrap-icons";

function ConsultToolbar() {
  return (
    <div className="consult-toolbar">

      <div className="date-group">

        <label>From :</label>

        <button className="date-box">
          <Calendar3 />
          <span>13-Jun-2026</span>
        </button>

      </div>

      <div className="date-group">

        <label>To :</label>

        <button className="date-box">
          <Calendar3 />
          <span>13-Jul-2026</span>
        </button>

      </div>

      <button className="go-btn">
        Go
      </button>

    </div>
  );
}

export default ConsultToolbar;