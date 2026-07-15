import "../styles/reports-dashboard.css";

function ReportsDashboard() {

  const cards = [
    {
      title: "Total Billing-All Departments",
      billed: 10500,
      collected: 10100,
      cash: 3300,
      card: 0,
      wallet: 6800,
      other: 0,
    },
    {
      title: "Consultation Billing",
      billed: 9300,
      collected: 9300,
      cash: 2900,
      card: 0,
      wallet: 6400,
      other: 0,
    },
    {
      title: "Lab Billing",
      billed: 0,
      collected: 0,
      cash: 0,
      card: 0,
      wallet: 0,
      other: 0,
    },
    {
      title: "Other Billing",
      billed: 1200,
      collected: 800,
      cash: 400,
      card: 0,
      wallet: 400,
      other: 0,
    },
  ];

  return (
    <div className="reports-page">

      {/* Information */}

      <div className="info-box">

        ℹ To give you a faster EMR experience, reports can be downloaded
        in buckets of 3 months. Download January–March first, followed by
        April–June. For longer duration contact support.

      </div>

      {/* Heading */}

      <h1 className="report-title">
        Organisation Report
      </h1>

      {/* Filters */}

      <div className="filter-row">

        <div className="filter-group">
          <label>Date Range</label>
          <input type="date" />
        </div>

        <div className="filter-group">
          <label>&nbsp;</label>
          <input type="date" />
        </div>

        <div className="filter-group clinic">

          <label>Clinic</label>

          <select>
            <option>
              Presidency Division - ASR DOCTOR CLINIC
            </option>
          </select>

        </div>

        <button className="generate-btn">
          GENERATE
        </button>

      </div>

      {/* Billing Cards */}

      <div className="billing-grid">

        {cards.map((card, index) => (

          <div
            key={index}
            className="billing-card"
          >

            <h3>{card.title}</h3>

            <hr />

            <div className="bill-row">
              <span>Total Billed</span>
              <b>{card.billed}</b>
            </div>

            <div className="bill-row">
              <span>Total Collected</span>
              <b>{card.collected}</b>
            </div>

            <div className="bill-row">
              <span>Cash</span>
              <b>{card.cash}</b>
            </div>

            <div className="bill-row">
              <span>Card</span>
              <b>{card.card}</b>
            </div>

            <div className="bill-row">
              <span>Wallet</span>
              <b>{card.wallet}</b>
            </div>

            <div className="bill-row">
              <span>Others</span>
              <b>{card.other}</b>
            </div>

            <button className="view-btn">
              View
            </button>

          </div>

        ))}

      </div>

      {/* Chart */}

      <div className="chart-box">

        <h3>Daily Earnings</h3>

        <div className="chart-placeholder">

          Bar Chart Here

        </div>

      </div>

      {/* Table */}

      <div className="table-box">

        <table>

          <thead>

            <tr>

              <th>Date</th>

              <th>New Registrations</th>

              <th>Billed Patients</th>

              <th>Consultations</th>

              <th>Lab</th>

              <th>Others</th>

              <th>Total Earnings</th>

            </tr>

          </thead>

          <tbody>

            <tr>

              <td>2026-07-15</td>

              <td>6</td>

              <td>17</td>

              <td>9300</td>

              <td>0</td>

              <td>800</td>

              <td>10100</td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );

}

export default ReportsDashboard;