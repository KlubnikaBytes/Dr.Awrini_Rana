import "../styles/frontdesk-table.css";

const patients = [
  {
    id: "ASR6491",
    token: 3,
    name: "Kalyan Kumar Cha",
    time: "10:09 AM",
    status: "ON-GOING",
    doctor: "Dr Aswini Rana",
    visit: "FOLLOW UP CONSULTATION(DR. ASW)"
  },
  {
    id: "ASR6659",
    token: 26,
    name: "Soumendra Nath E",
    time: "06:45 PM",
    status: "BOOKED",
    doctor: "Dr Aswini Rana",
    visit: "FOLLOW UP CONSULTATION(DR. ASW)"
  },
  {
    id: "4325",
    token: 28,
    name: "Sujoy Saha",
    time: "10:45 AM",
    status: "BOOKED",
    doctor: "Dr Aswini Rana",
    visit: "REPORT"
  },
  {
    id: "ASR8171",
    token: 25,
    name: "Ananya Bhattacha",
    time: "10:00 AM",
    status: "BOOKED",
    doctor: "Dr Aswini Rana",
    visit: "FIRST CONSULTATION (DR ASWINI)"
  },
  {
    id: "ASR8180",
    token: 27,
    name: "Sarmishtha Basak",
    time: "10:00 AM",
    status: "BOOKED",
    doctor: "Dr Aswini Rana",
    visit: "FIRST CONSULTATION (DR ASWINI)"
  }
];

function FrontdeskTable() {
  return (
    <div className="fd-table-wrapper">

      <table className="fd-table">

        <tbody>

          {patients.map((p, i) => (

            <tr key={i}>

              <td className="patient-id">{p.id}</td>

              <td>
                <div className="token-box">
                  <span className="dot"></span>
                  <span>{p.token}</span>
                </div>
              </td>

              <td className="patient-name">{p.name}</td>

              <td>-</td>

              <td>
                <button className="info-btn">i ▼</button>
              </td>

              <td className="bill-link">Add Bill</td>

              <td>{p.time}</td>

              <td className="status">{p.status}</td>

              <td>{p.doctor}</td>

              <td>{p.visit}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default FrontdeskTable;