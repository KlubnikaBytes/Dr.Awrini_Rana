const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./models/Appointment');
  const appts = await Appointment.find().sort({createdAt: -1}).limit(20).select('date queueNumber doctorName createdAt').lean();
  console.log(appts);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
