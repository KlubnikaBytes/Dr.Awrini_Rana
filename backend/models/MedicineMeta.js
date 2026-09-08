const mongoose = require('mongoose');

const medicineMetaSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  medicineName: { type: String, required: true },
  genericName: { type: String, default: '' },
  company: { type: String, default: '' },
  mrName: { type: String, default: '' }
}, { timestamps: true });

// Ensure unique medicine per clinic (if clinics are separated)
// But since the user might want global or clinic-specific, let's keep it simple: unique medicineName.
medicineMetaSchema.index({ medicineName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('MedicineMeta', medicineMetaSchema);
