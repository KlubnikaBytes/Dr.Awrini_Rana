import "./../styles/appointment.css";

const patients = [
  {
    id: "ASR8156",
    token: 15,
    name: "Akashdeep Banerjee(42Y, M)",
    recent: "--",
    visits: 0,
    time: "6:00 PM",
    status: "BOOKED",
    purpose: "FIRST CONSULTATION (DR ASWINI)"
  },
  {
    id: "ASR8172",
    token: 33,
    name: "Gitashri Chatterjee(60Y, F)",
    recent: "--",
    visits: 0,
    time: "6:00 PM",
    status: "BOOKED",
    purpose: "FIRST CONSULTATION (DR ASWINI)"
  },
  {
    id: "ASR8172",
    token: 34,
    name: "Gitashri Chatterjee(60Y, F)",
    recent: "--",
    visits: 0,
    time: "6:00 PM",
    status: "BOOKED",
    purpose: "FIRST CONSULTATION (DR ASWINI)"
  }
];

function AppointmentTable() {
  return (
    <div className="appointment-table-wrapper">

      <div className="appointment-table-scroll">

        <table className="appointment-table">

          <thead>

            <tr>
              <th>ID</th>
              <th>Token</th>
              <th>Patient name</th>
              <th>Visit</th>
              <th>Recent visit</th>
              <th>#Visits</th>
              <th>Time</th>
              <th>Wait Status</th>
              <th>Purpose</th>
            </tr>

          </thead>

          <tbody>

            {patients.map((item, index) => (

              <tr key={index}>

                <td>{item.id}</td>

                <td>
                  <div className="token-box">
                    {item.token}
                  </div>
                </td>

                <td className="patient-name">
                  {item.name}
                </td>

                <td>
                  <button className="visit-btn">
                    Visit Pad
                  </button>
                </td>

                <td>{item.recent}</td>

                <td>{item.visits}</td>

                <td>{item.time}</td>

                <td className="booked">
                  {item.status}
                </td>

                <td className="purpose">
                  {item.purpose}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default AppointmentTable;