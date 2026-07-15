import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

const patients = [
  {
    id: 4278,
    name: "Mani Chakravarty(59Y, F)",
    phone: "",
    visit: "13-Jul-2026"
  },
  {
    id: "ASR8170",
    name: "Aisha Siddika(22Y, F)",
    phone: "",
    visit: "13-Jul-2026"
  },
  {
    id: "ASR6967",
    name: "Rina Goswami(65Y, F)",
    phone: "",
    visit: "13-Jul-2026"
  },
  {
    id: 4068,
    name: "Tapan Goswami(66Y, M)",
    phone: "",
    visit: "13-Jul-2026"
  },
  {
    id: 1158,
    name: "Prabita Mondal(50Y, F)",
    phone: "9230212294",
    visit: "13-Jul-2026"
  },
  {
    id: "ASR8202",
    name: "Rina Mondal(45Y, F)",
    phone: "",
    visit: "12-Jul-2026"
  },
  {
    id: "ASR8210",
    name: "Sourav Roy(38Y, M)",
    phone: "",
    visit: "11-Jul-2026"
  }
];

function ConsultTable() {
  return (
    <div className="consult-table">

      <div className="consult-header">

        <h2>Consultations</h2>

        <div className="consult-top-right">

          <span className="page-info">
            1 - 50 of 542
          </span>

          <button className="page-btn">
            <ChevronLeft />
          </button>

          <button className="page-btn">
            <ChevronRight />
          </button>

        </div>

      </div>

      <div className="consult-body">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Patient name</th>
              <th>Phone</th>
              <th>Last visit</th>
              <th>View</th>
            </tr>

          </thead>

          <tbody>

            {patients.map((p, i) => (

              <tr key={i}>

                <td>{p.id}</td>

                <td>{p.name}</td>

                <td>{p.phone}</td>

                <td>{p.visit}</td>

                <td>
                  <button className="visit-btn">
                    Visit Pad
                  </button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default ConsultTable;