const mongoose = require('mongoose');

const vaccineTemplateSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['Pediatric', 'Maternal', 'Other'],
    unique: true
  },
  vaccines: { 
    type: Array, 
    default: [] 
  }
}, { timestamps: true });

module.exports = mongoose.model('VaccineTemplate', vaccineTemplateSchema);
