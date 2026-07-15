import {
  Search,
  PersonCircle,
  EnvelopeFill,
  TelephoneFill,
} from "react-bootstrap-icons";

function StaffList() {
  return (
    <div className="staff-list">

      <div className="staff-header">

        <div className="search-box">
          <input
            placeholder="Search"
          />
          <Search />
        </div>

        <div className="total">
          Total: 2
        </div>

        <button className="add-btn">
          + Add New
        </button>

      </div>

      <div className="staff-card">

        <PersonCircle className="avatar" />

        <div className="staff-info">

          <h3>Dr Aswini Rana</h3>

          <p>
            <EnvelopeFill /> aswini.rana@gmail.com
          </p>

        </div>

        <div className="staff-right">

          <p>(Role: Doctor | ID:5048938763)</p>

          <p>
            <TelephoneFill /> 9002535240
          </p>

        </div>

      </div>

      <div className="staff-card">

        <PersonCircle className="avatar" />

        <div className="staff-info">

          <h3>Ratri</h3>

          <p>
            <EnvelopeFill />
            asrdoctorclinic@gmail.com
          </p>

        </div>

        <div className="staff-right">

          <p>(Role: Frontdesk | ID:5071249754)</p>

          <p>
            <TelephoneFill />
            9002535241
          </p>

        </div>

      </div>

    </div>
  );
}

export default StaffList;