const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  patientId: { type: String, required: true, unique: true }, // e.g. ASR8048
  designation: { type: String, enum: ['Mr', 'Ms', 'Mrs', 'Dr', 'Master'], default: 'Mr' },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  pin: { type: String },
  dob: { type: Date },
  vaccines: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
