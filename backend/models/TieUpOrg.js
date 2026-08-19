const mongoose = require('mongoose');

const tieUpOrgSchema = new mongoose.Schema({
  clinicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

// Optional: Ensure unique name per clinic
tieUpOrgSchema.index({ clinicId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('TieUpOrg', tieUpOrgSchema);
