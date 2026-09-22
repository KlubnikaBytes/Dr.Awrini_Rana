const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./models/Appointment');
  require('./models/Patient');
  
  const appts = await Appointment.find({
    doctorName: 'ASWINI RANA',
  }).populate('patient').sort({ date: -1 }).lean();
  
  console.log(`Found ${appts.length} appointments for ASWINI RANA globally`);
  
  // Count by date
  const counts = {};
  for (let a of appts) {
    const d = a.date ? a.date.toISOString().split('T')[0] : 'No Date';
    counts[d] = (counts[d] || 0) + 1;
  }
  console.log(counts);
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
