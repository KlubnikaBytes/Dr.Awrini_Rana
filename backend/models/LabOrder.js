const mongoose = require('mongoose');

const labTestItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  name:     { type: String, required: true },
  value:    { type: String, default: '' },
  unit:     { type: String, default: '' },
  status:   { type: String, enum: ['Pending', 'Done'], default: 'Pending' }
});

const labOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Patient info (can be typed in without needing a Patient record)
  patientName:   { type: String, required: true },
  patientAge:    { type: String },
  patientGender: { type: String, enum: ['Male', 'Female', 'Other'] },
  patientPhone:  { type: String },
  uhid:          { type: String },   // optional link to existing patient
  referredBy:    { type: String },   // referring doctor

  // Order
  orderedDate:   { type: Date, default: Date.now },
  sampleType:    { type: String, enum: ['Blood', 'Urine', 'Stool', 'Sputum', 'Swab', 'Other'], default: 'Blood' },
  sampleCollectedAt: { type: Date },
  priority:      { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },

  // Tests ordered
  tests: [labTestItemSchema],

  // Overall status
  status: { type: String, enum: ['Registered', 'Sample Collected', 'Processing', 'Completed'], default: 'Registered' },

  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LabOrder', labOrderSchema);
