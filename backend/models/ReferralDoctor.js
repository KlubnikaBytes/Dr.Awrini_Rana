const mongoose = require('mongoose');

const referralDoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ReferralDoctor', referralDoctorSchema);
