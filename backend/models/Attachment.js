const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, // optional — doctor uploads have no appointment
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attachment', attachmentSchema);

