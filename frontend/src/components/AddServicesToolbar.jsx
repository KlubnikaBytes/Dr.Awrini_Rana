function AddServicesToolbar() {
  return (
    <div className="service-top">

      <div className="service-tabs">

        <button className="service-tab active">
          Appointment Services
        </button>

        <button className="service-tab">
          Other Services
        </button>

      </div>

      <button className="add-btn">
        + New Appointment Service
      </button>

    </div>
  );
}

export default AddServicesToolbar;