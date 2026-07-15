import {
    Calendar3,
    Upload,
    Grid3x3Gap,
    GearFill
} from "react-bootstrap-icons";

function TopToolbar() {
    return (
        <div className="top-toolbar">

            <div className="toolbar-left">

                <button className="date-btn">
                    <Calendar3 />
                    <span>13 Jul,2026</span>
                </button>

                <div className="stats">
                    <span>Total : <b>0</b></span>
                    <span>Pending : <b>0</b></span>
                    <span>Complete : <b>0</b></span>
                </div>

            </div>

            <div className="toolbar-right">

                <button className="toolbar-btn">
                    <Upload />
                    Upload Patient List
                </button>

                <button className="toolbar-btn">
                    <Grid3x3Gap />
                    View Reports
                </button>

                <button className="setting-btn">
                    <GearFill />
                </button>

            </div>

        </div>
    );
}

export default TopToolbar;