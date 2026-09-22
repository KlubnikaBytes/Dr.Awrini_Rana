const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  clinicId: { type: String },              // clinic this staff member belongs to
  name: { type: String, required: true },
  designation: { type: String, default: 'Dr.' },  // e.g. Dr., Pt., Dt., or custom
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  role: { type: String, default: 'Staff' },
  email: { type: String },
  phone: { type: String },
  password: { type: String },
  signatureText: { type: String },
  speciality: { type: String },
  department: { type: String },
  signatureImage: { type: String }, // Base64 string
  staffId: { type: String, unique: true },
  // Doctor-specific fields
  qualifications: { type: String },       // e.g. "MBBS(CAL), MD(MEDICINE), IPGMER"
  registrationNo: { type: String },       // e.g. "Reg no - 65941 (WBMC)"
  contactForPrescription: { type: String }, // phone/contact shown on prescription
  bio: { type: String },                  // extra details shown on prescription
  fees: { type: Number, default: 0 },     // Consultation Fees
  // Doctor Portal Login — set by admin
  doctorLoginId: { type: String, unique: true, sparse: true }, // e.g. "DOC001"
  doctorLoginPassword: { type: String },                       // bcrypt-hashed
}, { timestamps: true });

// Hash main password before saving
staffSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Hash doctorLoginPassword before saving
staffSchema.pre('save', async function () {
  if (!this.isModified('doctorLoginPassword') || !this.doctorLoginPassword) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.doctorLoginPassword = await bcrypt.hash(this.doctorLoginPassword, salt);
});

// Auto-generate a staff ID (e.g., 5048938763 style)
staffSchema.pre('save', function() {
  if (!this.staffId) {
    this.staffId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
});

module.exports = mongoose.model('Staff', staffSchema);
