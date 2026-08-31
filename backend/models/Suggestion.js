const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['COMPLAINT', 'DIAGNOSIS', 'TEST', 'PAST_HISTORY', 'PHYSICAL_EXAM', 'ADVICE', 'DOSAGE', 'MEDICINE', 'GENERIC_NAME', 'WHEN', 'FREQUENCY', 'DURATION', 'NOTES', 'REFERRED_DOCTOR', 'ALLERGIES', 'PERSONAL_HISTORY', 'PAST_MEDICAL_HISTORY', 'FAMILY_HISTORY'], required: true },
  text: { type: String, required: true }
}, { timestamps: true });

// Ensure a doctor doesn't get duplicate suggestions of the same type
suggestionSchema.index({ userId: 1, type: 1, text: 1 }, { unique: true });

module.exports = mongoose.model('Suggestion', suggestionSchema);
