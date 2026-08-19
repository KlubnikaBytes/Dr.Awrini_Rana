const mongoose = require('mongoose');

// Single global counter — patientId must be unique across ALL clinics
const counterSchema = new mongoose.Schema({
  _id: { type: String, default: 'global_asr' },
  seq: { type: Number, default: 0 }
});

// Atomically increment and return next ID like ASR000001
counterSchema.statics.nextId = async function () {
  const op = {};
  op['$inc'] = { seq: 1 };
  const doc = await this.findOneAndUpdate(
    { _id: 'global_asr' },
    op,
    { new: true, upsert: true }
  );
  return 'ASR' + String(doc.seq).padStart(6, '0');
};

module.exports = mongoose.model('Counter', counterSchema);
