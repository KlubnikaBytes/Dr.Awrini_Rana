const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  logo: { type: String, default: null }, // URL path to the clinic logo
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Clinic', clinicSchema);
