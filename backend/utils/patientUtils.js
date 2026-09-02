const Patient = require('../models/Patient');
const Counter = require('../models/Counter');

/**
 * Finds an existing patient by phone+name or name, or creates a new one.
 * @param {Object} req - The express request object containing user and clinic info.
 * @param {Object} data - Patient details extracted from the incoming request.
 * @returns {String} The patientId (uhid) of the matched or newly created patient.
 */
exports.findOrCreatePatient = async (req, data) => {
  const { 
    phone, 
    name, 
    designation, 
    age, 
    gender, 
    bloodGroup, 
    email, 
    address, 
    city, 
    pin, 
    dob,
    referredByDoctor
  } = data;

  let patient = null;

  // 1. Match by phone and exact name (case-insensitive)
  if (phone && name) {
    patient = await Patient.findOne({ 
      phone, 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      clinicId: req.clinicId 
    });
  }

  // 2. Fallback: Match by just name
  if (!patient && name) {
    patient = await Patient.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      clinicId: req.clinicId 
    });
  }

  if (!patient) {
    // Generate the next sequential ASR ID
    const newId = await Counter.nextId();
    patient = await Patient.create({
      userId: req.user._id,
      clinicId: req.clinicId,
      patientId: newId,
      designation: designation || 'Mr',
      name: name || 'Unknown',
      age: age ? Number(age) : 30,
      gender: gender || 'Other',
      bloodGroup: bloodGroup || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      city: city || '',
      pin: pin || '',
      dob: dob || null,
      referredByDoctor: referredByDoctor || ''
    });
  } else {
    // Update email or phone if missing
    let needsSave = false;
    if (phone && !patient.phone) {
      patient.phone = phone;
      needsSave = true;
    }
    if (email && !patient.email) {
      patient.email = email;
      needsSave = true;
    }
    if (referredByDoctor && !patient.referredByDoctor) {
      patient.referredByDoctor = referredByDoctor;
      needsSave = true;
    }
    if (needsSave) {
      await patient.save();
    }
  }

  return patient.patientId;
};
