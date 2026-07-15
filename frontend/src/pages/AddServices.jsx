import AddServicesToolbar from "../components/AddServicesToolbar";
import AddServicesTable from "../components/AddServicesTable";
import "../styles/add-services.css";

function AddServices() {
  return (
    <div className="add-services-page">
      <AddServicesToolbar />
      <AddServicesTable />
    </div>
  );
}

export default AddServices;