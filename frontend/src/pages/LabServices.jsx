import "../styles/lab-services.css";

function LabServices() {

  return (

    <div className="lab-services-page">

      <h1>Services</h1>

      <div className="lab-service-card">

        <div className="lab-tabs">

          <button className="active">
            Lab Test Services
          </button>

          <button>
            Lab Test Package Services
          </button>

        </div>

        <div className="lab-search-box">

          <input
            type="text"
            placeholder="Search"
          />

        </div>

        <table>

          <thead>

            <tr>

              <th>Service ID</th>

              <th>CODE</th>

              <th>Test Name</th>

              <th>Services Name</th>

              <th>Edit OPD</th>

              <th>Edit IPD</th>

            </tr>

          </thead>

          <tbody>

            <tr>

              <td>5029139448</td>

              <td></td>

              <td>1,25 Dihydroxy Vitamin D Serum</td>

              <td>VITAMIN D</td>

              <td>
                <button>Edit OPD</button>
              </td>

              <td>
                <button>Add to IPD</button>
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  );

}

export default LabServices;