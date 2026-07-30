const mongoose = require('mongoose');

const testItemSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  value: { type: String, required: true },
  unit: { type: String, default: '' },
  category: { type: String, default: 'Additional Tests' }
});

const testResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  tests: [testItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('TestResult', testResultSchema);
