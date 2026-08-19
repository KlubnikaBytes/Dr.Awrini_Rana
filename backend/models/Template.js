const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  clinicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  section: { 
    type: String, 
    required: true 
  },
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }
}, { timestamps: true });

// Ensure unique template names per section within a clinic
templateSchema.index({ clinicId: 1, section: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Template', templateSchema);
