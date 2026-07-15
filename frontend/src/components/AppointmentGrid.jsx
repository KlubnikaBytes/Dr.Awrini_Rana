const times = [];

let hour = 11;
let minute = 0;

for (let i = 0; i < 80; i++) {

    let h = hour > 12 ? hour - 12 : hour;
    let ampm = hour >= 12 ? "PM" : "AM";

    times.push(
        `${String(h).padStart(2,"0")}:${String(minute).padStart(2,"0")} ${ampm}`
    );

    minute += 5;

    if(minute===60){
        minute=0;
        hour++;
    }

}

function AppointmentGrid(){

    return(

        <div className="appointment-grid">

            <div className="time-column">

                {times.map((time,index)=>

                    <div key={index} className="time-cell">

                        {time}

                    </div>

                )}

            </div>

            <div className="schedule-column">

                {times.map((_,index)=>

                    <div key={index} className="schedule-cell"></div>

                )}

            </div>

        </div>

    )

}

export default AppointmentGrid;