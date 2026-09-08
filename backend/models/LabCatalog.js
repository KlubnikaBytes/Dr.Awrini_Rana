const mongoose = require('mongoose');

const labServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  safeRange: { type: String, default: '' }
});

const labCatalogSchema = new mongoose.Schema({
  clinicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  section: { 
    type: String, 
    required: true 
  },
  price: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  safeRange: { type: String, default: '' },
  impressionTemplate: { type: String, default: '' }, // default impression text for reports
  services: [labServiceSchema]
}, { timestamps: true });

labCatalogSchema.index({ clinicId: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('LabCatalog', labCatalogSchema);
