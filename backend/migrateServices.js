require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./models/Service');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const result = await Service.updateMany(
      { type: 'Appointment' },
      { $set: { type: 'Consultation' } }
    );
    console.log(`Migrated ${result.modifiedCount} services from Appointment to Consultation.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
