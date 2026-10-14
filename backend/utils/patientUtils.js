const Patient = require('../models/Patient');
const Counter = require('../models/Counter');
const Clinic = require('../models/Clinic');

/**
 * Finds an existing patient by phone+name or name, or creates a new one.
 * @param {Object} req - The express request object containing user and clinic info.
 * @param {Object} data - Patient details extracted from the incoming request.
 * @returns {String} The patientId (uhid) of the matched or newly created patient.
 */
exports.findOrCreatePatient = async (req, data) => {
  const { 
    patientId,
    uhid,
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

  // 1. If explicit patientId / uhid was provided, find by that exact ID
  const targetId = patientId || uhid;
  if (targetId) {
    patient = await Patient.findOne({ patientId: targetId, clinicId: req.clinicId });
  }

  // 2. Match ONLY if both phone AND name are provided and match an existing record
  const trimmedPhone = phone ? String(phone).trim() : '';
  const trimmedName = name ? String(name).trim() : '';

  if (!patient && trimmedPhone && trimmedName) {
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patient = await Patient.findOne({ 
      phone: trimmedPhone, 
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }, 
      clinicId: req.clinicId 
    });
  }

  // CRITICAL: NEVER fallback to matching by name alone. Multiple different patients can share the same name!
  // If no patient found by exact ID or by (phone + name), create a BRAND NEW patient!

  if (!patient) {
    let prefix = 'ASR';
    try {
      if (req.clinicId) {
        const clinic = await Clinic.findById(req.clinicId);
        if (clinic && clinic.patientIdPrefix) {
          prefix = clinic.patientIdPrefix;
        }
      }
    } catch (err) {
      console.error('Error fetching clinic for prefix:', err);
    }
    // Generate the next sequential ID
    const newId = await Counter.nextId(prefix);
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
