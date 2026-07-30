const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: String, required: true, unique: true }, // e.g. ASR8048
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  phone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
