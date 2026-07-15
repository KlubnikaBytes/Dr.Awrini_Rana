import {
  DashCircleFill,
  ArrowUpRight,
  HandThumbsUp,
  HandThumbsDown
} from "react-bootstrap-icons";

const cards = [
  {
    title: "Front Desk: Send Bills via WhatsApp",
    credit: "10 Credits",
    text: "Front desk users can now share patient bills via WhatsApp/SMS from the front desk module."
  },
  {
    title: "Password Update Policy",
    credit: "10 Credits",
    text: "As part of NABH, all HealthPlix users are required to update their login password every 90 days. You can check the remaining days from your profile section."
  },
  {
    title: "Drawing Board",
    credit: "",
    text: "Now you can attach images/draw on your prescription. Click on watch video to see how to enable this feature."
  },
  {
    title: "Copy Previous Visit Data",
    credit: "",
    text: "Customize your prescription further by configuring which fields get copied to the next visit."
  }
];

function PlixBoard() {
  return (
    <div className="plix-board">

      <div className="plix-header">

        <div className="plix-title">
          <DashCircleFill />
          <span>Plix Board</span>
          <div className="notify">3</div>
        </div>

        <div className="plix-actions">
          <button>All Updates</button>
          <button>-</button>
        </div>

      </div>

      <div className="plix-scroll">

        <div className="robin-card">

          <div className="robin-head">
            Robin Dashboard
            <ArrowUpRight />
          </div>

          <div className="stats-row">

            <div className="mini-card">
              <h6>Patient footfall<br />(Jun 26 vs May 26)</h6>
              <span>0%</span>
            </div>

            <div className="mini-card">
              <h6>Number of patient in current month</h6>
              <span>70</span>
            </div>

          </div>

        </div>

        {cards.map((item, index) => (

          <div className="news-card" key={index}>

            <div className="news-header">

              <span>{item.title}</span>

              {item.credit && (
                <div className="credit-tag">
                  {item.credit}
                </div>
              )}

            </div>

            <div className="news-body">
              {item.text}
            </div>

            <div className="news-footer">

              <button>
                Watch Video
              </button>

              <div className="reaction">

                <HandThumbsUp />

                <HandThumbsDown />

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default PlixBoard;