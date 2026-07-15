import "../styles/lab.css";

function LabDashboard() {
  return (
    <div className="lab-page">

      <div className="lab-top">

        <label>
          <input type="checkbox" />
          Print on Letterhead
        </label>

        <div className="lab-date">

          <input
            type="date"
            defaultValue="2026-07-15"
          />

          <button>GO</button>

          <button>Today</button>

        </div>

      </div>

      <div className="lab-table">

        <div className="lab-search">

          <input placeholder="Search" />

        </div>

        <table>

          <thead>

            <tr>
              <th>Bill No</th>
              <th>ID</th>
              <th>Name</th>
              <th>Bill</th>
              <th>Test(s)</th>
              <th>Status</th>
              <th>Print</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            <tr>
              <td colSpan="8">
                No data available in table
              </td>
            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default LabDashboard;