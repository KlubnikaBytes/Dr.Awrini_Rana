const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorName: { type: String },
  service: { type: String },
  serviceType: { type: String, enum: ['Consultation', 'Lab', 'Day Care', 'Home Care', 'Other'], default: 'Consultation' },
  status: { type: String, enum: ['BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED', 'CANCELLED'], default: 'BOOKED' },
  date: { type: Date, required: true },
  time: { type: String }, // Now optional
  duration: { type: String }, // Now optional
  queueNumber: { type: Number },
  isPriority: { type: Boolean, default: false },
  billingStatus: { type: String, enum: ['UNBILLED', 'UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
  uhid: { type: String },   // patient's permanent ASR ID
  vitals: {
    bpSystolic: String,
    bpDiastolic: String,
    pulse: String,
    height: String,
    weight: String,
    temperature: String,
    spo2: String
  },
  followUpDate: { type: Date, default: null } // computed from doctor's next visit
}, { timestamps: true });

appointmentSchema.index({ clinicId: 1, date: -1 });
appointmentSchema.index({ clinicId: 1, patient: 1 });
appointmentSchema.index({ clinicId: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
