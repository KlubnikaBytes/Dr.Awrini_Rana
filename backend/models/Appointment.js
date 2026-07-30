const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorName: { type: String, required: true },
  service: { type: String, required: true },
  status: { type: String, enum: ['BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED'], default: 'BOOKED' },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // e.g., '06:30 PM'
  duration: { type: String, required: true }, // e.g., '5 mins'
  billingStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
  vitals: {
    bpSystolic: String,
    bpDiastolic: String,
    pulse: String,
    height: String,
    weight: String,
    temperature: String,
    spo2: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
