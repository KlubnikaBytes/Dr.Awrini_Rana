import "../styles/lab-find-reports.css";

function LabFindReports() {
  return (
    <div className="lab-report-page">

      <div className="lab-report-header">

        <h1>Find Lab Report</h1>

        <button className="search-patient-btn">
          Search Patient
        </button>

      </div>

      <div className="lab-report-card">

        <div className="table-search">
          <input placeholder="Search" />
        </div>

        <table>

          <thead>

            <tr>
              <th>Order Date</th>
              <th>Test(s)</th>
              <th>Status</th>
              <th>Print</th>
            </tr>

          </thead>

          <tbody>

            <tr>
              <td colSpan="4">
                No data available in table
              </td>
            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default LabFindReports;