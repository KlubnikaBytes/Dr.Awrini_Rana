const mongoose = require('mongoose');

const medicineDirectorySchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: false },
  type: { type: String },
  medicineName: { type: String, required: true },
  genericName: { type: String },
  dosage: { type: String },
  when: { type: String },
  frequency: { type: String },
  duration: { type: String },
  notes: { type: String },
  instructions: { type: String },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

medicineDirectorySchema.index({ medicineName: 1 });

module.exports = mongoose.model('MedicineDirectory', medicineDirectorySchema);

