import "../styles/patientq.css";

function PatientQTable() {
  return (
    <div className="patientq-page">

      <table className="patientq-table">

        <thead>
          <tr>
            <th>Token</th>
            <th>Appt Time</th>
            <th>Patient Name</th>
            <th>P ID</th>
            <th>Doctor</th>
          </tr>
        </thead>

        <tbody>
          {/* Data will come later */}
        </tbody>

      </table>

    </div>
  );
}

export default PatientQTable;