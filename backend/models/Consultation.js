const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  
  vitals: {
    bpSystolic: String,
    bpDiastolic: String,
    pulse: String,
    height: String,
    weight: String,
    temperature: String,
    bmi: String,
    waistHip: String,
    spo2: String
  },
  
  complaints: [{ type: String }],
  pastHistory: { type: String, default: '' },
  physicalExamination: { type: String, default: '' },
  diagnosis: [{ type: String }],
  
  medicines: [{
    type: { type: String }, // e.g. TAB., CAP., SYP.
    medicineName: { type: String },
    genericName: { type: String },
    dosage: { type: String }, // e.g. 1-0-1
    when: { type: String }, // e.g. After Breakfast
    frequency: { type: String }, // e.g. daily
    duration: { type: String }, // e.g. 1 month
    notes: { type: String }
  }],
  
  advice: { type: String, default: '' },
  testsRequested: [{ type: String }],
  
  nextVisit: {
    value: { type: String },
    unit: { type: String }, // e.g. Days, Weeks, Months, or specific Date
    date: { type: Date }
  },

  referredTo: {
    doctorName: { type: String, default: '' },
    speciality: { type: String, default: '' },
    phoneNo: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  historyDetails: {
    allergies: [{ type: String }],
    personalHistory: [{ type: String }],
    pastMedicalHistory: [{ type: String }],
    familyHistory: [{ type: String }]
  },
  pastMedications: [{ type: String }],
  physicalExaminationDetails: {
    isNad: { type: Boolean, default: false },
    breast: { type: String, default: '' },
    perSpeculum: { type: String, default: '' },
    perAbdominal: { type: String, default: '' },
    perVaginal: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
