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
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
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
