const mongoose = require('mongoose');

const labCatalogSchema = new mongoose.Schema({
  clinicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  tests: [{ 
    type: String 
  }]
}, { timestamps: true });

labCatalogSchema.index({ clinicId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('LabCatalog', labCatalogSchema);
