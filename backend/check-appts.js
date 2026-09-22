const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./models/Appointment');
  require('./models/Patient');
  
  const dateStr = "2026-09-22";
  const startDate = new Date(dateStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateStr);
  endDate.setHours(23, 59, 59, 999);

  const appts = await Appointment.find({
    doctorName: 'ASWINI RANA',
    date: { $gte: startDate, $lte: endDate }
  }).populate('patient').lean();
  
  console.log(`Found ${appts.length} appointments for ASWINI RANA on 22-Sep-2026 (local matching)`);
  for (let a of appts) {
    console.log(`Patient: ${a.patient?.name || 'N/A'}, Q: ${a.queueNumber}, Service: ${a.service}, Type: ${a.serviceType}`);
  }
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
