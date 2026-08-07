const mongoose = require('mongoose');

const labTestItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  name:     { type: String, required: true },
  value:    { type: String, default: '' },
  unit:     { type: String, default: '' },
  status:   { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
  // billing
  unitPrice: { type: Number, default: 0 },
  qty:       { type: Number, default: 1 },
  discount:  { type: Number, default: 0 },
  tax:       { type: Number, default: 0 },
  totalPrice:{ type: Number, default: 0 }
});

const labPaymentSchema = new mongoose.Schema({
  amount:      { type: Number, required: true },
  paymentMode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'NETBANKING'], default: 'CASH' },
  paidAt:      { type: Date, default: Date.now },
  note:        { type: String, default: '' }
});

const labOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },

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

  // ─── Billing ───────────────────────────────────────────────
  totalBilledAmount: { type: Number, default: 0 },
  totalDiscount:     { type: Number, default: 0 },
  totalTax:          { type: Number, default: 0 },
  finalAmount:       { type: Number, default: 0 },
  receivedAmount:    { type: Number, default: 0 },
  balanceAmount:     { type: Number, default: 0 },
  billStatus:        { type: String, enum: ['Unbilled', 'Partial', 'Paid'], default: 'Unbilled' },
  billDate:          { type: Date },
  payments:          [labPaymentSchema],

}, { timestamps: true });

module.exports = mongoose.model('LabOrder', labOrderSchema);

