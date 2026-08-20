const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  gstPercent: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true, default: 0 }
});

const paymentEntrySchema = new mongoose.Schema({
  amount:      { type: Number, required: true },
  paymentMode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'NETBANKING'], default: 'CASH' },
  purpose:     { type: String, default: '' },
  paidAt:      { type: Date, default: Date.now }
});

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  dayCare:     { type: mongoose.Schema.Types.ObjectId, ref: 'DayCare' },
  homeCare:    { type: mongoose.Schema.Types.ObjectId, ref: 'HomeCare' },
  sourceType:  { type: String, enum: ['Appointment', 'DayCare', 'HomeCare', 'Other'], default: 'Appointment' },
  // For DayCare/HomeCare records that don't have a linked Patient document
  patientName: { type: String },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  billedBy:    { type: String, default: '' }, // Name of the staff who created the bill
  billDate: { type: Date, default: Date.now },
  items: [billItemSchema],
  payments: [paymentEntrySchema],          // full payment history
  depositAmount: { type: Number, default: 0 },
  totalBilledAmount: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },
  totalBalance: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'NETBANKING'], default: 'CASH' }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
