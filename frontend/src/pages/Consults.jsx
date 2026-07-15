import ConsultToolbar from "../components/ConsultToolbar";
import ConsultTable from "../components/ConsultTable";
import PlixBoard from "../components/PlixBoard";

import "../styles/consult.css";

function Consults() {
  return (

    <>

      <ConsultToolbar />

      <div className="consult-page">

        <div className="consult-left">

          <ConsultTable />

        </div>

        <div className="consult-right">

          <PlixBoard />

        </div>

      </div>

    </>

  );
}

export default Consults;