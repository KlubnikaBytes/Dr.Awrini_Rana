const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  logo: { type: String, default: null }, // URL path to the clinic logo
  isActive: { type: Boolean, default: true },
  patientIdPrefix: { type: String, default: 'ASR' },
  passcode: { type: String } // optional passcode for entering clinic
}, { timestamps: true });

module.exports = mongoose.model('Clinic', clinicSchema);
