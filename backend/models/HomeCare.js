const mongoose = require('mongoose');

const homeCareDocumentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const homeCareSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  
  // Patient Info
  patientName: { type: String, required: true },
  patientAge: { type: String },
  patientGender: { type: String, enum: ['Male', 'Female', 'Other'] },
  patientPhone: { type: String },
  patientAddress: { type: String },
  uhid: { type: String },   // patient's permanent ASR ID
  diagnosis: { type: String },
  
  // Service Info
  serviceType: { 
    type: String, 
    enum: ['Nursing Care', 'Physiotherapy', 'Doctor Visit', 'Lab Collection', 'Wound Dressing', 'IV Infusion', 'Post-Surgery Care', 'Elderly Care', 'Other'],
    required: true
  },
  serviceDescription: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  frequency: { type: String, enum: ['Once', 'Daily', 'Weekly', 'Alternate Days', 'Monthly'] },
  timeSlot: { type: String },
  
  // Caregiver/Performer Info
  performerName: { type: String, required: true },
  performerRole: { type: String, enum: ['Nurse', 'Doctor', 'Physiotherapist', 'Lab Technician', 'Caregiver', 'Other'] },
  performerPhone: { type: String },
  
  // Who actually visited
  visitedBy: { type: String },
  visitedByRole: { type: String, enum: ['Nurse', 'Doctor', 'Physiotherapist', 'Lab Technician', 'Caregiver', 'Other', ''] },
  visitedAt: { type: Date },
  
  // Status & Notes
  status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'], default: 'Scheduled' },
  notes: { type: String },
  
  // Documents
  documents: [homeCareDocumentSchema],
}, { timestamps: true });

module.exports = mongoose.model('HomeCare', homeCareSchema);
