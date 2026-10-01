require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Patient = require('./models/Patient');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const patient = await Patient.findOne({ name: /Anita Mahata/i });
  console.log("Patient:", patient);
  if (patient) {
    const appts = await Appointment.find({ patient: patient._id }).lean();
    console.log("Appointments:", appts);
  }
  mongoose.disconnect();
});
