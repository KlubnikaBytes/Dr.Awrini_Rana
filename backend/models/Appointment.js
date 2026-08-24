const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorName: { type: String, required: true },
  service: { type: String, required: true },
  status: { type: String, enum: ['BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED', 'CANCELLED'], default: 'BOOKED' },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // e.g., '06:30 PM'
  duration: { type: String, required: true }, // e.g., '5 mins'
  billingStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
  uhid: { type: String },   // patient's permanent ASR ID
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
