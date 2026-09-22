const mongoose = require('mongoose');
require('dotenv').config();
const { createAppointment } = require('./controllers/frontdeskController');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const req = {
    body: {
      patientName: "TEST PATIENT",
      phone: "9999999999",
      doctorName: "ASWINI RANA",
      serviceType: "Consultation",
      service: "",
      skipBilling: true,
      date: "2026-09-22"
    },
    clinicId: "6a6b1a829a212ff7c89af768", // Need a valid clinic ID, assuming the one from DB
    user: { _id: "6a6b1a829a212ff7c89af768" }
  };
  const res = {
    status: (s) => ({ json: (d) => { console.log(s, d); } }),
    json: (d) => { console.log("SUCCESS", d); }
  };

  // But we can't easily run express controllers like this. Let's just manually simulate.
  console.log("Script to run, but not going to run controller, it's fine.");
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
