const mongoose = require('mongoose');

const clinicDirectorySchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  type: { type: String, required: true }, // 'COMPLAINT', 'DIAGNOSIS', 'PAST_HISTORY', etc.
  text: { type: String, required: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure unique text per type per clinic
clinicDirectorySchema.index({ clinicId: 1, type: 1, text: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('ClinicDirectory', clinicDirectorySchema);
