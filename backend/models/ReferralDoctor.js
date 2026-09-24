const mongoose = require('mongoose');

const referralDoctorSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  type: { type: String, enum: ['BY', 'TO'], default: 'BY' }
}, { timestamps: true });

module.exports = mongoose.model('ReferralDoctor', referralDoctorSchema);
