const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./models/Appointment');
  const appts = await Appointment.find({ doctorName: 'ASWINI RANA' }).lean();
  let countFollowup = 0;
  for (let a of appts) {
    if (a.service === 'Followup') countFollowup++;
  }
  console.log(`ASWINI RANA total appts: ${appts.length}, Followup appts: ${countFollowup}`);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
