const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  role: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  signatureText: { type: String },
  speciality: { type: String },
  department: { type: String },
  signatureImage: { type: String }, // Base64 string
  staffId: { type: String, unique: true }
}, { timestamps: true });

// Hash password before saving
staffSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Auto-generate a staff ID (e.g., 5048938763 style)
staffSchema.pre('save', function() {
  if (!this.staffId) {
    this.staffId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
});

module.exports = mongoose.model('Staff', staffSchema);
