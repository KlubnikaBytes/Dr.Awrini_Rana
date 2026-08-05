const mongoose = require('mongoose');

const vaccineRecordSchema = new mongoose.Schema({
  vaccineName:  { type: String },
  dose:         { type: String },
  batchNumber:  { type: String },
  site:         { type: String, enum: ['Left Arm','Right Arm','Left Thigh','Right Thigh','Oral','Other'] },
  route:        { type: String, enum: ['IM','SC','IV','Oral','ID','Other'] },
  givenAt:      { type: Date },
  givenBy:      { type: String }
});

const medicationSchema = new mongoose.Schema({
  name:      { type: String },
  dosage:    { type: String },
  route:     { type: String, enum: ['Oral','IV','IM','SC','Topical','Inhalation','Other'] },
  frequency: { type: String },
  givenAt:   { type: Date },
  givenBy:   { type: String }
});

const procedureSchema = new mongoose.Schema({
  name:        { type: String },
  description: { type: String },
  performedAt: { type: Date },
  performedBy: { type: String }
});

const vitalSchema = new mongoose.Schema({
  recordedAt:  { type: Date, default: Date.now },
  bp:          { type: String },
  pulse:       { type: String },
  temperature: { type: String },
  spO2:        { type: String },
  rbs:         { type: String },
  weight:      { type: String },
  notes:       { type: String }
});

const dayCareDocSchema = new mongoose.Schema({
  fileName:   { type: String },
  fileUrl:    { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const dayCareSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Patient
  patientName:    { type: String, required: true },
  patientAge:     { type: String },
  patientGender:  { type: String, enum: ['Male','Female','Other'] },
  patientPhone:   { type: String },
  patientAddress: { type: String },
  uhid:           { type: String },  // Unique Hospital ID
  diagnosis:      { type: String },
  chiefComplaint: { type: String },

  // Admission
  admissionDate: { type: Date, required: true },
  admissionTime: { type: String },
  bedNumber:     { type: String },
  ward:          { type: String },

  // Assigned Staff
  doctorName:        { type: String },
  doctorDesignation: { type: String },
  nurseInCharge:     { type: String },

  // Clinical
  procedures:  [procedureSchema],
  medications: [medicationSchema],
  vaccines:    [vaccineRecordSchema],
  vitals:      [vitalSchema],

  // Discharge
  dischargeDate:  { type: Date },
  dischargeTime:  { type: String },
  dischargeNotes: { type: String },
  followUpDate:   { type: Date },
  followUpNotes:  { type: String },

  // Status & Notes
  status: { type: String, enum: ['Admitted','Under Observation','Discharged','Cancelled'], default: 'Admitted' },
  notes:  { type: String },

  // Documents
  documents: [dayCareDocSchema],

}, { timestamps: true });

module.exports = mongoose.model('DayCare', dayCareSchema);
