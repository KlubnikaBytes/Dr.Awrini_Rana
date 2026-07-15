const packs = [
  { credit: 1000, price: 150 },
  { credit: 2000, price: 300 },
  { credit: 3000, price: 450 },
  { credit: 5000, price: 750 },
  { credit: 10000, price: 1500 },
  { credit: 25000, price: 3750 }
];

function BulkMessage() {
  return (
    <div className="bulk-wrapper">

      <div className="bulk-scroll">

        <div className="doctor-code">
          Doctor Code :
          <strong> HPE11522</strong>
        </div>

        <div className="bulk-header">

          <div className="bulk-title">
            Bulk Message
          </div>

          <div className="bulk-credit">
            Credits:
            <strong>4971</strong>
            <span className="arrow">⌄</span>
          </div>

        </div>

        <div className="bulk-tabs">

          <button>Send Bulk Msg</button>

          <button>View Sent Msg</button>

          <button className="active">
            Buy Msg Credits
          </button>

        </div>

        <div className="bulk-list">

          {packs.map((pack) => (

            <div className="pack" key={pack.credit}>

              <div className="pack-left">

                <h4>
                  MESSAGE PACK {pack.credit.toLocaleString()}
                </h4>

                <div className="credit-row">

                  <span className="credit-number">
                    {pack.credit}
                  </span>

                  <span className="credit-text">
                    Msg Credit
                  </span>

                </div>

              </div>

              <button className="buy-btn">
                Buy @ ₹{pack.price}
              </button>

            </div>

          ))}

        </div>

        {/* Announcement */}

        <div className="notice yellow">

          <p>

            <strong>Important announcement:</strong>

            As per the latest enactment in the Income Tax laws,
            section 194-O requires the company to deduct TDS on
            online consultation payouts.

            <br /><br />

            <a href="#">Click Here To Know More</a>

          </p>

        </div>

        <div className="notice blue">

          <p>

            Your bank details are not updated to receive payments.

            <a href="#"> Click Here</a>

            to add bank details.

          </p>

        </div>

      </div>

    </div>
  );
}

export default BulkMessage;