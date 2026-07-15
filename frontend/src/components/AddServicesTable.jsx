import { Trash } from "react-bootstrap-icons";

const services = [
  {
    id: "5029127764",
    name: "FIRST CONSULTATION (DR ASWINI RANA)",
    price: 800,
    gst: 0,
    priority: 1,
    owner: "Dr Aswini Rana",
  },
  {
    id: "5029396248",
    name: "ONLINE CONSULTATION (DR ASWINI RANA)",
    price: 800,
    gst: 0,
    priority: 1,
    owner: "Dr Aswini Rana",
  },
  {
    id: "5031163852",
    name: "INFLUVAC TETRA CLINIC",
    price: 0,
    gst: 0,
    priority: 1,
    owner: "Dr Aswini Rana",
  },
  {
    id: "5026293477",
    name: "FOLLOW UP CONSULTATION (DR ASWINI RANA)",
    price: 800,
    gst: 0,
    priority: 2,
    owner: "Dr Aswini Rana",
  },
  {
    id: "5029142824",
    name: "REPORT",
    price: 0,
    gst: 0,
    priority: 2,
    owner: "Dr Aswini Rana",
  },
  {
    id: "5029218628",
    name: "MEDICAL CERTIFICATE",
    price: 800,
    gst: 0,
    priority: 2,
    owner: "Dr Aswini Rana",
  },
];

function AddServicesTable() {
  return (
    <div className="service-table">
      <table>

        <thead>
          <tr>
            <th>CODE</th>
            <th>Service ID</th>
            <th>Service Name</th>
            <th>Price</th>
            <th>GST (%)</th>
            <th>Priority</th>
            <th>Service Owner</th>
            <th>Edit</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {services.map((service, index) => (

            <tr key={index}>

              <td></td>

              <td>{service.id}</td>

              <td>{service.name}</td>

              <td>{service.price}</td>

              <td>{service.gst}</td>

              <td>{service.priority}</td>

              <td>{service.owner}</td>

              <td className="edit-link">Edit</td>

              <td>
                <Trash className="delete-btn" />
              </td>

            </tr>

          ))}

        </tbody>

      </table>
    </div>
  );
}

export default AddServicesTable;