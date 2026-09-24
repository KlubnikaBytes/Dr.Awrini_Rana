const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
