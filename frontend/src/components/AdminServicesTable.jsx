import {
  Search,
  PencilFill,
  TrashFill,
} from "react-bootstrap-icons";

function AdminServicesTable() {

  return (

    <div className="service-wrapper">

      <div className="service-header">

        <div className="service-search">

          <input placeholder="Search" />

          <Search />

        </div>

        <button className="service-add">
          + ADD NEW
        </button>

        <div className="service-count">
          1 - 29 of 29
        </div>

      </div>

      <table className="service-table">

        <thead>

          <tr>
            <th>Code</th>
            <th>Service ID</th>
            <th>Service Name</th>
            <th>Price</th>
            <th>GST (%)</th>
            <th>Priority</th>
            <th>Service Owner</th>
            <th>Service Color</th>
            <th>Valid Till</th>
            <th>Actions</th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td></td>
            <td>5029127764</td>

            <td>
              FIRST CONSULTATION
              <br />
              (DR ASWINI RANA)
            </td>

            <td>800</td>

            <td>0</td>

            <td>1-High</td>

            <td>dr aswini rana</td>

            <td>

              <div
                style={{
                  width:35,
                  height:35,
                  background:"#42e51c",
                  borderRadius:4
                }}
              />

            </td>

            <td>0</td>

            <td>

              <PencilFill />

              <TrashFill style={{marginLeft:15}}/>

            </td>

          </tr>

        </tbody>

      </table>

    </div>
  );
}

export default AdminServicesTable;