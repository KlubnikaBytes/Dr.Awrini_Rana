const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const VaccineTemplate = require('../models/VaccineTemplate');
const Template = require('../models/Template');
const TestResult = require('../models/TestResult');
const LabOrder = require('../models/LabOrder');
const Attachment = require('../models/Attachment');
const Staff = require('../models/Staff');
const { broadcast } = require('../websocket');

exports.getConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Check if appointment exists and belongs to user
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId }).populate('patient');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    let consultation = await Consultation.findOne({ appointment: appointmentId, clinicId: req.clinicId });

    // Fetch the doctor's staff profile by name (with or without Dr. prefix) and role
    let cleanDocName = appointment.doctorName || '';
    if (cleanDocName.toLowerCase().startsWith('dr. ')) cleanDocName = cleanDocName.substring(4).trim();
    else if (cleanDocName.toLowerCase().startsWith('dr ')) cleanDocName = cleanDocName.substring(3).trim();

    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeDocName = escapeRegex(cleanDocName);

    const nameQuery = {
      $or: [
        { name: { $regex: new RegExp(`^${safeDocName}$`, 'i') } },
        { name: { $regex: new RegExp(`^Dr\\.?\\s*${safeDocName}$`, 'i') } }
      ],
      role: 'Doctor'
    };
    // Fetch ALL matching doctor records (across clinics as fallback),
    // prefer the one WITH a signature image so it's never missed
    const allMatchingDoctors = await Staff.find(nameQuery).select('-password').lean();
    // First priority: same clinic + has signature. Second: same clinic. Third: has signature. Fourth: any.
    const doctorProfile =
      allMatchingDoctors.find(d => String(d.clinicId) === String(req.clinicId) && d.signatureImage) ||
      allMatchingDoctors.find(d => String(d.clinicId) === String(req.clinicId)) ||
      allMatchingDoctors.find(d => d.signatureImage) ||
      allMatchingDoctors[0] ||
      null;

    if (!consultation) {
      // Return a blank template
      consultation = {
        appointment: appointment, // passed as full object
        patient: appointment.patient,
        vitals: appointment.vitals || {},
        complaints: [],
        pastHistory: '',
        physicalExamination: '',
        diagnosis: [],
        medicines: [],
        advice: '',
        testsRequested: [],
        testsInstruction: '',
        nextVisit: { value: '', unit: '' },
        doctor: doctorProfile || null
      };
    } else {
      // Attach patient info and doctor profile for the frontend header
      consultation = consultation.toObject();
      consultation.appointment = appointment;
      consultation.patient = appointment.patient;
      consultation.doctor = doctorProfile || null;
    }

    res.json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching consultation', error: error.message });
  }
};

exports.getPastConsultations = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Validate patientId is a valid ObjectId to avoid cast errors
    if (!mongoose.isValidObjectId(patientId)) {
      return res.json([]);
    }

    // Try with clinicId first; some older consultations may not have clinicId set
    let consultations = await Consultation.find({ patient: patientId, clinicId: req.clinicId })
      .sort({ createdAt: -1 })
      .populate('appointment')
      .populate('patient');

    // If nothing found, fall back to patient-only filter (handles records with no clinicId)
    if (!consultations || consultations.length === 0) {
      consultations = await Consultation.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .populate('appointment')
        .populate('patient');
    }

    res.json(consultations);
  } catch (error) {
    console.error('[getPastConsultations]', error.message);
    res.status(500).json({ message: 'Error fetching past consultations', error: error.message });
  }
};

const Suggestion = require('../models/Suggestion');

let medicineDirectorySynced = false;

const ensureGlobalMedicineDirectorySynced = async (clinicId) => {
  if (medicineDirectorySynced) return;
  const MedicineDirectory = require('../models/MedicineDirectory');
  const Consultation = require('../models/Consultation');
  const ClinicDirectory = require('../models/ClinicDirectory');

  try {
    // 1. Fetch all existing medicines (both active and deleted) so we never resurrect deleted ones
    const existingMeds = await MedicineDirectory.find({}).select('medicineName isDeleted').lean();
    const existingNameSet = new Set(existingMeds.map(m => (m.medicineName || '').trim().toUpperCase()));

    const candidatesToInsert = new Map();

    // 2. Scan Consultation records for prescribed medicines not yet in MedicineDirectory
    const aggMedicines = await Consultation.aggregate([
      { $unwind: { path: "$medicines", preserveNullAndEmptyArrays: false } },
      { $sort: { createdAt: -1 } },
      {
        $match: {
          "medicines.medicineName": { $type: "string", $ne: "" }
        }
      },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: "$medicines.medicineName" } } },
          type: { $first: "$medicines.type" },
          medicineName: { $first: "$medicines.medicineName" },
          genericName: { $first: "$medicines.genericName" },
          dosage: { $first: "$medicines.dosage" },
          when: { $first: "$medicines.when" },
          frequency: { $first: "$medicines.frequency" },
          duration: { $first: "$medicines.duration" },
          notes: { $first: "$medicines.notes" },
          instructions: { $first: "$medicines.instructions" }
        }
      }
    ]);

    aggMedicines.forEach(m => {
      const upperName = (m.medicineName || '').trim().toUpperCase();
      if (upperName && !existingNameSet.has(upperName) && !candidatesToInsert.has(upperName)) {
        candidatesToInsert.set(upperName, {
          type: m.type || 'TAB.',
          medicineName: upperName,
          genericName: m.genericName || '',
          dosage: m.dosage || '',
          when: m.when || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          notes: m.notes || '',
          instructions: m.instructions || '',
          clinicId: clinicId || null,
          isDeleted: false
        });
      }
    });

    // 3. Scan Suggestion records where type === 'MEDICINE' and isDeleted is not true
    const medSuggestions = await Suggestion.find({
      type: 'MEDICINE',
      isDeleted: { $ne: true }
    }).select('text').lean();

    medSuggestions.forEach(s => {
      const upperName = (s.text || '').trim().toUpperCase();
      if (upperName && !existingNameSet.has(upperName) && !candidatesToInsert.has(upperName)) {
        candidatesToInsert.set(upperName, {
          type: 'TAB.',
          medicineName: upperName,
          genericName: '',
          dosage: '',
          when: '',
          frequency: '',
          duration: '',
          notes: '',
          instructions: '',
          clinicId: clinicId || null,
          isDeleted: false
        });
      }
    });

    // 4. Scan ClinicDirectory records where type === 'MEDICINE' and isDeleted is false
    const clinicDirMeds = await ClinicDirectory.find({
      type: 'MEDICINE',
      isDeleted: false
    }).select('text').lean();

    clinicDirMeds.forEach(c => {
      const upperName = (c.text || '').trim().toUpperCase();
      if (upperName && !existingNameSet.has(upperName) && !candidatesToInsert.has(upperName)) {
        candidatesToInsert.set(upperName, {
          type: 'TAB.',
          medicineName: upperName,
          genericName: '',
          dosage: '',
          when: '',
          frequency: '',
          duration: '',
          notes: '',
          instructions: '',
          clinicId: clinicId || null,
          isDeleted: false
        });
      }
    });

    // 5. Bulk insert candidates
    if (candidatesToInsert.size > 0) {
      const ops = Array.from(candidatesToInsert.values()).map(doc => ({
        updateOne: {
          filter: { medicineName: doc.medicineName },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      await MedicineDirectory.bulkWrite(ops, { ordered: false });
    }

    medicineDirectorySynced = true;
  } catch (err) {
    console.error('[ensureGlobalMedicineDirectorySynced] error:', err);
  }
};

exports.getAllMedicines = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    await ensureGlobalMedicineDirectorySynced(req.clinicId);

    const medicines = await MedicineDirectory.find({ isDeleted: false }).sort({ medicineName: 1 });
    res.json(medicines);
  } catch (error) {
    console.error('[getAllMedicines]', error);
    res.status(500).json({ message: 'Error fetching medicines', error: error.message });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    const medicine = req.body;
    if (!medicine.medicineName || !medicine.medicineName.trim()) {
      return res.status(400).json({ message: 'Medicine name required' });
    }

    const trimmedName = medicine.medicineName.trim().toUpperCase();
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if it already exists globally (and is not deleted)
    const existing = await MedicineDirectory.findOne({
      medicineName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      isDeleted: false
    });

    if (existing) {
      return res.status(400).json({ message: 'Medicine already added' });
    }

    const result = await MedicineDirectory.findOneAndUpdate(
      { medicineName: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
      { 
        $set: { 
          ...medicine, 
          medicineName: trimmedName, 
          clinicId: req.clinicId || null, 
          isDeleted: false 
        } 
      },
      { upsert: true, new: true }
    );

    // Also un-delete in Suggestion and ClinicDirectory if previously soft-deleted
    try {
      const Suggestion = require('../models/Suggestion');
      await Suggestion.updateMany(
        { type: 'MEDICINE', text: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
        { $set: { isDeleted: false } }
      );
      const ClinicDirectory = require('../models/ClinicDirectory');
      await ClinicDirectory.updateMany(
        { type: 'MEDICINE', text: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
        { $set: { isDeleted: false } }
      );
    } catch (_) {}

    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: 'MEDICINE', action: 'added', medicineName: trimmedName });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error adding medicine', error: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    const { id } = req.params;
    const medicine = req.body;

    if (medicine.medicineName && medicine.medicineName.trim()) {
      const trimmedName = medicine.medicineName.trim().toUpperCase();
      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Check if new name conflicts with another existing active medicine globally
      const existing = await MedicineDirectory.findOne({
        medicineName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        isDeleted: false,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Medicine already added' });
      }
      medicine.medicineName = trimmedName;
    }

    const result = await MedicineDirectory.findOneAndUpdate(
      { _id: id },
      { $set: medicine },
      { new: true }
    );

    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: 'MEDICINE', action: 'updated' });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating medicine', error: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    const { id } = req.params;

    const med = await MedicineDirectory.findOneAndUpdate(
      { _id: id },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (med && med.medicineName) {
      const escaped = med.medicineName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped}$`, 'i');

      try {
        const Suggestion = require('../models/Suggestion');
        await Suggestion.updateMany(
          { type: 'MEDICINE', text: regex },
          { $set: { isDeleted: true } }
        );

        const ClinicDirectory = require('../models/ClinicDirectory');
        await ClinicDirectory.updateMany(
          { type: 'MEDICINE', text: regex },
          { $set: { isDeleted: true } }
        );
      } catch (_) {}
    }

    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: 'MEDICINE', action: 'deleted', medicineName: med?.medicineName });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting medicine', error: error.message });
  }
};

const CASE_SENSITIVE_SUGGESTION_TYPES = new Set(['NOTES', 'WHEN', 'FREQUENCY', 'DURATION', 'DOSAGE']);
const syncedDirectoryTypes = new Set();
let legacyClinicDirIndexChecked = false;

const normalizeDirectoryText = (type, val) => {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  return CASE_SENSITIVE_SUGGESTION_TYPES.has(type) ? trimmed : trimmed.toUpperCase();
};

const getDirectoryQueryTypes = (type) => {
  if (type === 'ALLERGY' || type === 'ALLERGIES') return ['ALLERGY', 'ALLERGIES'];
  return [type];
};

const extractTextsFromConsultations = (consultations, type) => {
  const uniqueTexts = new Set();
  const addTexts = (val) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(item => {
        if (typeof item === 'string') {
          const norm = normalizeDirectoryText(type, item);
          if (norm) uniqueTexts.add(norm);
        } else if (typeof item === 'object' && item.testName) {
          const norm = normalizeDirectoryText(type, item.testName);
          if (norm) uniqueTexts.add(norm);
        }
      });
    } else if (typeof val === 'string') {
      val.split('\n').forEach(line => {
        const norm = normalizeDirectoryText(type, line);
        if (norm) uniqueTexts.add(norm);
      });
    }
  };

  consultations.forEach(c => {
    if (type === 'COMPLAINT') addTexts(c.complaints);
    else if (type === 'DIAGNOSIS') addTexts(c.diagnosis);
    else if (type === 'TEST') addTexts(c.testsRequested);
    else if (type === 'TEST_INSTRUCTION') addTexts(c.testsInstruction);
    else if (type === 'PAST_HISTORY') addTexts(c.pastHistory);
    else if (type === 'PHYSICAL_EXAM') addTexts(c.physicalExamination);
    else if (type === 'ADVICE') addTexts(c.advice);
    else if (type === 'ALLERGY' || type === 'ALLERGIES') addTexts(c.historyDetails?.allergies);
    else if (type === 'PERSONAL_HISTORY') addTexts(c.historyDetails?.personalHistory);
    else if (type === 'PAST_MEDICAL_HISTORY') addTexts(c.historyDetails?.pastMedicalHistory);
    else if (type === 'FAMILY_HISTORY') addTexts(c.historyDetails?.familyHistory);
    else if (type === 'PAST_MEDICATION') addTexts(c.pastMedications);
    else if (c.medicines && Array.isArray(c.medicines)) {
      c.medicines.forEach(m => {
        if (type === 'WHEN' && m.when && m.when.trim()) uniqueTexts.add(m.when.trim());
        else if (type === 'FREQUENCY' && m.frequency && m.frequency.trim()) uniqueTexts.add(m.frequency.trim());
        else if (type === 'DURATION' && m.duration && m.duration.trim()) uniqueTexts.add(m.duration.trim());
        else if (type === 'NOTES' && m.notes && m.notes.trim()) uniqueTexts.add(m.notes.trim());
        else if (type === 'DOSAGE' && m.dosage && m.dosage.trim()) uniqueTexts.add(m.dosage.trim());
      });
    }
  });
  return uniqueTexts;
};

const ensureGlobalDirectorySynced = async (type, clinicId) => {
  const ClinicDirectory = require('../models/ClinicDirectory');
  const canonicalType = type === 'ALLERGY' ? 'ALLERGIES' : type;
  if (syncedDirectoryTypes.has(canonicalType)) return;

  // Ensure legacy per-clinic unique index (clinicId_1_type_1_text_1) does not block global entries
  if (!legacyClinicDirIndexChecked) {
    legacyClinicDirIndexChecked = true;
    try {
      const indexes = await ClinicDirectory.collection.indexes();
      for (const idx of indexes) {
        if (idx.name && idx.name.includes('clinicId_1') && idx.unique) {
          await ClinicDirectory.collection.dropIndex(idx.name);
        }
      }
    } catch (err) {
      // Ignore index check/drop errors
    }
  }

  try {
    const queryTypes = getDirectoryQueryTypes(canonicalType);
    const existingEntries = await ClinicDirectory.find({ type: canonicalType }).select('text isDeleted').lean();
    const existingKeySet = new Set(existingEntries.map(e => (e.text || '').trim().toUpperCase()));

    const candidates = new Set();

    // Backfill non-deleted entries from legacy personal Suggestion documents across all clinics/users
    const legacySuggestions = await Suggestion.find({
      type: { $in: queryTypes },
      isDeleted: { $ne: true }
    }).select('text').lean();
    legacySuggestions.forEach(s => {
      const norm = normalizeDirectoryText(canonicalType, s.text);
      if (norm && !existingKeySet.has(norm.toUpperCase())) {
        candidates.add(norm);
      }
    });

    // Backfill from Consultation history if global ClinicDirectory has no active entries for this type
    const activeCount = existingEntries.filter(e => !e.isDeleted).length;
    if (activeCount === 0) {
      const consultations = await Consultation.find({}).lean();
      const consultTexts = extractTextsFromConsultations(consultations, canonicalType);
      consultTexts.forEach(t => {
        if (!existingKeySet.has(t.toUpperCase())) {
          candidates.add(t);
        }
      });
    }

    if (candidates.size > 0) {
      const ops = Array.from(candidates).map(text => ({
        updateOne: {
          filter: { type: canonicalType, text },
          update: { $setOnInsert: { type: canonicalType, text, isDeleted: false, clinicId: clinicId || null } },
          upsert: true
        }
      }));
      try {
        await ClinicDirectory.bulkWrite(ops, { ordered: false });
      } catch (err) {
        // Ignore duplicate collision during concurrent backfill
      }
    }

    syncedDirectoryTypes.add(canonicalType);
  } catch (err) {
    // Non-fatal; allow normal query to proceed
  }
};

exports.getClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const { type } = req.query;
    if (!type) return res.json([]);

    const canonicalType = type === 'ALLERGY' ? 'ALLERGIES' : type;
    await ensureGlobalDirectorySynced(canonicalType, req.clinicId);

    const entries = await ClinicDirectory.find({ type: canonicalType, isDeleted: false }).sort({ text: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching directory', error: error.message });
  }
};

exports.addClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const { type, text } = req.body;
    if (!type || !text || !text.trim()) return res.status(400).json({ message: 'Invalid data' });

    const trimmed = text.trim().toUpperCase();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existing = await ClinicDirectory.findOne({
      type, text: { $regex: new RegExp(`^${escaped}$`, 'i') }, isDeleted: false
    });
    if (existing) return res.status(400).json({ message: 'Entry already exists' });

    const result = await ClinicDirectory.findOneAndUpdate(
      { type, text: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { $set: { type, text: trimmed, isDeleted: false, clinicId: req.clinicId || null } },
      { upsert: true, new: true }
    );
    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type, action: 'added' });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error adding entry', error: error.message });
  }
};

exports.updateClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const { id } = req.params;
    const { text, type } = req.body;

    if (!text || !text.trim()) return res.status(400).json({ message: 'Text is required' });
    const trimmed = text.trim().toUpperCase();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existing = await ClinicDirectory.findOne({
      type, text: { $regex: new RegExp(`^${escaped}$`, 'i') }, isDeleted: false, _id: { $ne: id }
    });
    if (existing) return res.status(400).json({ message: 'Entry already exists' });

    const result = await ClinicDirectory.findOneAndUpdate(
      { _id: id },
      { $set: { text: trimmed } },
      { new: true }
    );
    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type, action: 'updated' });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error: error.message });
  }
};

exports.deleteClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const doc = await ClinicDirectory.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { isDeleted: true } },
      { new: true }
    );
    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: doc?.type, action: 'deleted' });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting entry', error: error.message });
  }
};

exports.addSuggestion = async (req, res) => {
  try {
    const { type, text } = req.body;
    if (!type || !text || !text.trim()) {
      return res.status(400).json({ message: 'Type and text are required' });
    }

    const trimmed = text.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Case-preserving for notes, when, frequency, duration, dosage; uppercase for others
    const storedText = ['NOTES', 'WHEN', 'FREQUENCY', 'DURATION', 'DOSAGE'].includes(type)
      ? trimmed
      : trimmed.toUpperCase();

    // 1. Personal suggestion
    const existing = await Suggestion.findOne({
      userId: req.user._id,
      clinicId: req.clinicId || null,
      type,
      text: { $regex: new RegExp(`^${escaped}$`, 'i') }
    });

    let suggestionResult = existing;
    if (!existing) {
      suggestionResult = await Suggestion.create({
        userId: req.user._id,
        clinicId: req.clinicId || null,
        type,
        text: storedText,
        isDeleted: false
      });
    }

    // 2. Global ClinicDirectory
    try {
      const ClinicDirectory = require('../models/ClinicDirectory');
      const existingDir = await ClinicDirectory.findOne({
        type,
        text: { $regex: new RegExp(`^${escaped}$`, 'i') }
      });
      if (!existingDir) {
        await ClinicDirectory.create({
          type,
          text: storedText,
          isDeleted: false,
          clinicId: req.clinicId || null
        });
      }
    } catch (e) {
      // Ignore unique index collision
    }

    // 3. If type === 'MEDICINE', also ensure entry in MedicineDirectory so it appears in Admin Portal
    if (type === 'MEDICINE') {
      try {
        const MedicineDirectory = require('../models/MedicineDirectory');
        await MedicineDirectory.findOneAndUpdate(
          { medicineName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          {
            $setOnInsert: {
              type: 'TAB.',
              medicineName: storedText,
              clinicId: req.clinicId || null,
              isDeleted: false
            }
          },
          { upsert: true, new: true }
        );
        broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: 'MEDICINE', action: 'added', medicineName: storedText });
      } catch (e) {
        // Ignore unique index collision
      }
    }

    res.json({ success: true, text: storedText, suggestion: suggestionResult });
  } catch (error) {
    res.status(500).json({ message: 'Error adding suggestion', error: error.message });
  }
};

exports.deleteSuggestion = async (req, res) => {
  try {
    const type = req.body?.type || req.query?.type;
    const text = req.body?.text || req.query?.text;
    if (!type || !text || !text.trim()) {
      return res.status(400).json({ message: 'Type and text are required' });
    }

    const trimmed = text.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}$`, 'i');

    // 1. Delete from personal suggestions
    await Suggestion.deleteMany({
      type,
      text: regex
    });

    // 2. Also soft-delete / update from ClinicDirectory
    const ClinicDirectory = require('../models/ClinicDirectory');
    await ClinicDirectory.updateMany(
      { type, text: regex },
      { $set: { isDeleted: true } }
    );

    broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type, action: 'deleted' });
    broadcast('APPOINTMENT_UPDATED', {});
    res.json({ success: true, message: 'Suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting suggestion', error: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { type, q } = req.query;
    if (!type) return res.status(400).json({ message: 'Type is required' });

    const canonicalType = type === 'ALLERGY' ? 'ALLERGIES' : type;
    const queryTypes = getDirectoryQueryTypes(type);
    const trimmedQ = q ? String(q).trim() : '';
    const escapedQ = trimmedQ ? trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    let suggestions = [];

    if (canonicalType === 'MEDICINE') {
      const MedicineDirectory = require('../models/MedicineDirectory');
      await ensureGlobalMedicineDirectorySynced(req.clinicId);

      let dirQuery = { isDeleted: false };
      if (escapedQ) dirQuery.medicineName = { $regex: new RegExp('^' + escapedQ, 'i') };
      const medDir = await MedicineDirectory.find(dirQuery).sort({ medicineName: 1 }).limit(100);
      suggestions = medDir.map(m => m.medicineName);
    } else {
      const ClinicDirectory = require('../models/ClinicDirectory');
      await ensureGlobalDirectorySynced(canonicalType, req.clinicId);

      if (escapedQ) {
        const prefixRegex = new RegExp('^' + escapedQ, 'i');
        const containsRegex = new RegExp(escapedQ, 'i');
        const [prefixDocs, containsDocs] = await Promise.all([
          ClinicDirectory.find({ type: { $in: queryTypes }, isDeleted: false, text: { $regex: prefixRegex } })
            .sort({ text: 1 })
            .limit(150)
            .lean(),
          ClinicDirectory.find({ type: { $in: queryTypes }, isDeleted: false, text: { $regex: containsRegex } })
            .sort({ text: 1 })
            .limit(150)
            .lean()
        ]);
        suggestions = [...prefixDocs.map(c => c.text), ...containsDocs.map(c => c.text)];
      } else {
        const clinicDir = await ClinicDirectory.find({ type: { $in: queryTypes }, isDeleted: false })
          .sort({ text: 1 })
          .limit(300)
          .lean();
        suggestions = clinicDir.map(c => c.text);
      }
    }

    // Merge with personal suggestions for backward compatibility (excluding globally deleted items)
    let personalList = [];
    if (req.user?._id) {
      let query = { userId: req.user._id, type: { $in: queryTypes }, isDeleted: { $ne: true } };
      if (escapedQ) {
        const prefixRegex = new RegExp('^' + escapedQ, 'i');
        const containsRegex = new RegExp(escapedQ, 'i');
        const [pPrefix, pContains] = await Promise.all([
          Suggestion.find({ ...query, text: { $regex: prefixRegex } }).sort({ text: 1 }).limit(100).lean(),
          Suggestion.find({ ...query, text: { $regex: containsRegex } }).sort({ text: 1 }).limit(100).lean()
        ]);
        personalList = [...pPrefix.map(s => s.text), ...pContains.map(s => s.text)];
      } else {
        const personalSuggestions = await Suggestion.find(query).sort({ text: 1 }).limit(200).lean();
        personalList = personalSuggestions.map(s => s.text);
      }

      if (canonicalType === 'MEDICINE' && personalList.length > 0) {
        const MedicineDirectory = require('../models/MedicineDirectory');
        const deletedMeds = await MedicineDirectory.find({ isDeleted: true })
          .select('medicineName')
          .lean();
        if (deletedMeds.length > 0) {
          const deletedSet = new Set(deletedMeds.map(d => (d.medicineName || '').trim().toUpperCase()));
          personalList = personalList.filter(t => !deletedSet.has(String(t).trim().toUpperCase()));
        }
      } else if (canonicalType !== 'MEDICINE' && personalList.length > 0) {
        const ClinicDirectory = require('../models/ClinicDirectory');
        const deletedDocs = await ClinicDirectory.find({ type: { $in: queryTypes }, isDeleted: true })
          .select('text')
          .lean();
        if (deletedDocs.length > 0) {
          const deletedSet = new Set(deletedDocs.map(d => (d.text || '').trim().toUpperCase()));
          personalList = personalList.filter(t => !deletedSet.has(String(t).trim().toUpperCase()));
        }
      }
    }

    const dedupMap = new Map();
    [...suggestions, ...personalList].forEach(item => {
      if (!item || typeof item !== 'string') return;
      const key = item.trim().toUpperCase();
      if (key && !dedupMap.has(key)) {
        dedupMap.set(key, item.trim());
      }
    });
    const combined = Array.from(dedupMap.values());

    if (trimmedQ) {
      // Sort matches so that startsWith comes first
      const lowerQ = trimmedQ.toLowerCase();
      combined.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerQ);
        const bStarts = b.toLowerCase().startsWith(lowerQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
    }

    res.json(combined.slice(0, 200));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suggestions', error: error.message });
  }
};

exports.saveConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const data = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    let consultation = await Consultation.findOne({ appointment: appointmentId, clinicId: req.clinicId });

    if (data.nextVisit && data.nextVisit.date === '') {
      data.nextVisit.date = null;
    }

    if (!consultation) {
      consultation = new Consultation({
        userId: req.user._id,
        clinicId: req.clinicId,
        appointment: appointmentId,
        patient: appointment.patient,
        ...data
      });
      if (consultation.nextVisit && consultation.nextVisit.date === '') {
        consultation.nextVisit.date = null;
      }
      await consultation.save();
    } else {
      // Build update object
      const updateData = {};
      if (data.vitals !== undefined) updateData.vitals = data.vitals;
      if (data.complaints !== undefined) updateData.complaints = data.complaints;
      if (data.pastHistory !== undefined) updateData.pastHistory = data.pastHistory;
      if (data.physicalExamination !== undefined) updateData.physicalExamination = data.physicalExamination;
      if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
      if (data.medicines !== undefined) updateData.medicines = data.medicines;
      if (data.advice !== undefined) updateData.advice = data.advice;
      if (data.testsRequested !== undefined) updateData.testsRequested = data.testsRequested;
      if (data.testsInstruction !== undefined) updateData.testsInstruction = data.testsInstruction;
      if (data.certificate !== undefined) updateData.certificate = data.certificate;
      if (data.nextVisit !== undefined) {
        updateData.nextVisit = data.nextVisit;
        if (updateData.nextVisit.date === '') updateData.nextVisit.date = null;
      }
      if (data.referredTo !== undefined) updateData.referredTo = data.referredTo;
      if (data.historyDetails !== undefined) updateData.historyDetails = data.historyDetails;
      if (data.pastMedications !== undefined) updateData.pastMedications = data.pastMedications;
      if (data.physicalExaminationDetails !== undefined) updateData.physicalExaminationDetails = data.physicalExaminationDetails;

      consultation = await Consultation.findOneAndUpdate(
        { appointment: appointmentId, clinicId: req.clinicId },
        { $set: updateData },
        { new: true }
      );
    }

    // ── Compute & store followUpDate on the appointment ──────────────────────
    // Only create a follow-up appointment on a MANUAL save (not autosave)
    const isAutoSave = data.isAutoSave === true;
    const nv = consultation.nextVisit;
    if (nv && !isAutoSave) {
      let followUpDate = null;
      if (nv.date) {
        // Doctor picked a specific date
        followUpDate = new Date(nv.date);
      } else if (nv.value && nv.unit) {
        const val = parseInt(nv.value, 10);
        if (!isNaN(val) && val > 0) {
          followUpDate = new Date();
          if (nv.unit === 'Days') followUpDate.setDate(followUpDate.getDate() + val);
          if (nv.unit === 'Weeks') followUpDate.setDate(followUpDate.getDate() + val * 7);
          if (nv.unit === 'Months') followUpDate.setMonth(followUpDate.getMonth() + val);
        }
      }
      if (followUpDate) {
        followUpDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // Find existing original appointment
        const originalAppointment = await Appointment.findById(appointmentId);
        if (originalAppointment) {
          originalAppointment.followUpDate = followUpDate;
          await originalAppointment.save();

          // Check if a follow-up appointment already exists for this patient, doctor, and date
          const existingFollowUp = await Appointment.findOne({
            patient: originalAppointment.patient,
            doctorName: originalAppointment.doctorName,
            clinicId: originalAppointment.clinicId,
            date: followUpDate,
            service: 'Followup'
          });

          if (!existingFollowUp) {
            // Find max queue number for that date
            const maxAppt = await Appointment.findOne({
              clinicId: originalAppointment.clinicId,
              date: followUpDate
            }).sort('-queueNumber');
            const newQueueNumber = maxAppt && maxAppt.queueNumber ? maxAppt.queueNumber + 1 : 1;

            await Appointment.create({
              userId: req.user._id,
              clinicId: originalAppointment.clinicId,
              patient: originalAppointment.patient,
              uhid: originalAppointment.uhid,
              doctorName: originalAppointment.doctorName,
              service: 'Followup',
              status: 'BOOKED',
              date: followUpDate,
              queueNumber: newQueueNumber,
              isPriority: false,
              billingStatus: 'UNPAID'
            });
          }
        }
      }
    } else if (nv && isAutoSave) {
      // On autosave, still update followUpDate on the appointment itself but don't create new appointments
      let followUpDate = null;
      if (nv.date) {
        followUpDate = new Date(nv.date);
      } else if (nv.value && nv.unit) {
        const val = parseInt(nv.value, 10);
        if (!isNaN(val) && val > 0) {
          followUpDate = new Date();
          if (nv.unit === 'Days') followUpDate.setDate(followUpDate.getDate() + val);
          if (nv.unit === 'Weeks') followUpDate.setDate(followUpDate.getDate() + val * 7);
          if (nv.unit === 'Months') followUpDate.setMonth(followUpDate.getMonth() + val);
        }
      }
      if (followUpDate) {
        followUpDate.setHours(0, 0, 0, 0);
        await Appointment.findByIdAndUpdate(appointmentId, { followUpDate });
      }
    }

    // Accumulate all tags into a single bulkWrite operation to prevent DB connection exhaustion during autosave
    const suggestionOps = [];
    const directoryOps = [];

    const addTagsToOps = (tags, type) => {
      if (!tags || !Array.isArray(tags)) return;
      for (const tag of tags) {
        if (!tag || typeof tag !== 'string' || !tag.trim()) continue;
        const text = ['NOTES', 'WHEN', 'FREQUENCY', 'DURATION', 'DOSAGE'].includes(type)
          ? tag.trim()
          : tag.trim().toUpperCase();

        // Suggestion for doctor personal autocomplete
        suggestionOps.push({
          updateOne: {
            filter: { userId: req.user._id, clinicId: req.clinicId, type, text },
            update: { $setOnInsert: { userId: req.user._id, clinicId: req.clinicId, type, text } },
            upsert: true
          }
        });

        // ClinicDirectory for admin global master list
        directoryOps.push({
          updateOne: {
            filter: { type, text },
            update: { $set: { type, text, isDeleted: false, clinicId: req.clinicId || null } },
            upsert: true
          }
        });
      }
    };

    const addTextBlocksToOps = (text, type) => {
      if (!text || typeof text !== 'string') return;
      const lines = text.split('\n');
      addTagsToOps(lines, type);
    };

    addTagsToOps(data.complaints, 'COMPLAINT');
    addTagsToOps(data.diagnosis, 'DIAGNOSIS');
    if (data.testsRequested && Array.isArray(data.testsRequested)) {
      const testNames = data.testsRequested.map(t => typeof t === 'string' ? t : t.testName).filter(Boolean);
      addTagsToOps(testNames, 'TEST');
    }
    if (data.testsInstruction) {
      addTagsToOps([data.testsInstruction], 'TEST_INSTRUCTION');
    }
    if (data.referredTo && data.referredTo.doctorName) {
      addTagsToOps([data.referredTo.doctorName], 'REFERRED_DOCTOR');
    }

    if (data.pastMedications && data.pastMedications.length > 0) {
      addTagsToOps(data.pastMedications, 'PAST_MEDICATION');
    }

    if (data.historyDetails) {
      if (data.historyDetails.allergies) addTagsToOps(data.historyDetails.allergies, 'ALLERGIES');
      if (data.historyDetails.personalHistory) addTagsToOps(data.historyDetails.personalHistory, 'PERSONAL_HISTORY');
      if (data.historyDetails.pastMedicalHistory) addTagsToOps(data.historyDetails.pastMedicalHistory, 'PAST_MEDICAL_HISTORY');
      if (data.historyDetails.familyHistory) addTagsToOps(data.historyDetails.familyHistory, 'FAMILY_HISTORY');
    }

    addTextBlocksToOps(data.pastHistory, 'PAST_HISTORY');
    addTextBlocksToOps(data.physicalExamination, 'PHYSICAL_EXAM');
    addTextBlocksToOps(data.advice, 'ADVICE');

    if (data.medicines && Array.isArray(data.medicines)) {
      const uniqueDosages = [...new Set(data.medicines.map(m => m.dosage).filter(Boolean))];
      addTagsToOps(uniqueDosages, 'DOSAGE');

      const uniqueMedicines = [...new Set(data.medicines.map(m => m.medicineName).filter(Boolean))];
      addTagsToOps(uniqueMedicines, 'MEDICINE');

      const uniqueGenerics = [...new Set(data.medicines.map(m => m.genericName).filter(Boolean))];
      addTagsToOps(uniqueGenerics, 'GENERIC_NAME');

      const uniqueWhens = [...new Set(data.medicines.map(m => m.when).filter(Boolean))];
      addTagsToOps(uniqueWhens, 'WHEN');

      const uniqueFrequencies = [...new Set(data.medicines.map(m => m.frequency).filter(Boolean))];
      addTagsToOps(uniqueFrequencies, 'FREQUENCY');

      const uniqueDurations = [...new Set(data.medicines.map(m => m.duration).filter(Boolean))];
      addTagsToOps(uniqueDurations, 'DURATION');

      const uniqueNotes = [...new Set(data.medicines.map(m => m.notes).filter(Boolean))];
      addTagsToOps(uniqueNotes, 'NOTES');

      // Upsert full medicine details into MedicineDirectory (unified)
      const medicineDirectoryOps = [];
      const MedicineDirectory = require('../models/MedicineDirectory');
      for (const m of data.medicines) {
        if (!m.medicineName || !m.medicineName.trim()) continue;
        const medName = m.medicineName.trim().toUpperCase();

        // Build the update object with only fields that are provided
        const setObj = { medicineName: medName, isDeleted: false };
        if (req.clinicId) setObj.clinicId = req.clinicId;
        if (m.type) setObj.type = m.type;
        if (m.genericName) setObj.genericName = m.genericName;
        if (m.dosage) setObj.dosage = m.dosage;
        if (m.when) setObj.when = m.when;
        if (m.frequency) setObj.frequency = m.frequency;
        if (m.duration) setObj.duration = m.duration;
        if (m.notes) setObj.notes = m.notes;
        if (m.instructions) setObj.instructions = m.instructions;

        medicineDirectoryOps.push({
          updateOne: {
            filter: { medicineName: medName },
            update: { $set: setObj },
            upsert: true
          }
        });
      }

      if (medicineDirectoryOps.length > 0) {
        try {
          await MedicineDirectory.bulkWrite(medicineDirectoryOps, { ordered: false });
          broadcast('PRESCRIPTION_DIRECTORY_UPDATED', { type: 'MEDICINE', action: 'saved' });
        } catch (err) { }
      }
    }

    if (suggestionOps.length > 0) {
      // Execute all upserts in one database roundtrip
      try {
        await Suggestion.bulkWrite(suggestionOps, { ordered: false });
      } catch (err) {
        // Ignore bulkWrite duplicate key errors
      }
    }

    if (directoryOps.length > 0) {
      try {
        const ClinicDirectory = require('../models/ClinicDirectory');
        await ClinicDirectory.bulkWrite(directoryOps, { ordered: false });
      } catch (err) { }
    }

    // Optionally update the appointment vitals too if they were changed here
    if (data.vitals) {
      await Appointment.findByIdAndUpdate(appointmentId, { vitals: data.vitals });
    }

    // Broadcast update so queues refresh
    const populated = await Appointment.findById(appointmentId).populate('patient').lean();
    broadcast('APPOINTMENT_UPDATED', populated);

    res.json({ message: 'Consultation saved successfully' });
  } catch (error) {
    console.error('Error saving consultation:', error);
    require('fs').writeFileSync('save_consultation_error.log', error.stack || error.toString());
    res.status(500).json({ message: 'Error saving consultation', error: error.message });
  }
};

exports.getMedicineDetails = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.json(null);

    const exactName = name.trim();
    const MedicineDirectory = require('../models/MedicineDirectory');

    // First, try to find an exact match in the MedicineDirectory across all clinics
    let bestMatch = await MedicineDirectory.findOne({
      medicineName: exactName.toUpperCase(),
      isDeleted: false
    });

    // If no exact match, try case-insensitive regex
    if (!bestMatch) {
      const escapedName = exactName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      bestMatch = await MedicineDirectory.findOne({
        medicineName: { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') },
        isDeleted: false
      });
    }

    if (bestMatch) {
      return res.json({
        type: bestMatch.type,
        medicineName: bestMatch.medicineName,
        genericName: bestMatch.genericName,
        dosage: bestMatch.dosage,
        when: bestMatch.when,
        frequency: bestMatch.frequency,
        duration: bestMatch.duration,
        notes: bestMatch.notes,
        instructions: bestMatch.instructions
      });
    }

    res.json(null);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching medicine details', error: error.message });
  }
};

const resolvePatientRecord = async (patientId, clinicId) => {
  let patient = null;
  if (mongoose.Types.ObjectId.isValid(patientId)) {
    if (clinicId) {
      patient = await Patient.findOne({ _id: patientId, clinicId });
    }
    if (!patient) {
      patient = await Patient.findById(patientId);
    }
  }
  if (!patient && clinicId) {
    patient = await Patient.findOne({ patientId, clinicId });
  }
  if (!patient) {
    patient = await Patient.findOne({ patientId });
  }
  if (!patient && mongoose.Types.ObjectId.isValid(patientId)) {
    const appt = await Appointment.findById(patientId);
    if (appt && appt.patient) {
      patient = await Patient.findById(appt.patient);
    }
  }
  return patient;
};

const hasEnteredVaccineEntries = (list) =>
  Array.isArray(list) &&
  list.some(v => v && (v.nameOfVaccine || v.administeredDate || v.dueDate || v.batchNumber || v.siteAdministered || v.routeOfAdministration || v.doseVolume || v.remarks || v.reminders));

exports.getPatientVaccines = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await resolvePatientRecord(patientId, req.clinicId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    let vaccines = Array.isArray(patient.vaccines) ? patient.vaccines : [];

    // Fallback for returning patients who may have an older duplicate Patient record in the same clinic
    if (!hasEnteredVaccineEntries(vaccines)) {
      const siblingOr = [];
      if (patient.patientId) siblingOr.push({ patientId: patient.patientId });
      if (patient.uhid) siblingOr.push({ uhid: patient.uhid });
      if (patient.name && patient.phone) {
        const escapedName = String(patient.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cleanPhone = String(patient.phone).replace(/\D/g, '');
        const last10 = cleanPhone.slice(-10);
        if (escapedName && last10) {
          siblingOr.push({
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            phone: { $regex: new RegExp(last10 + '$') }
          });
        }
      }

      if (siblingOr.length > 0) {
        const siblingQuery = {
          _id: { $ne: patient._id },
          ...(patient.clinicId ? { clinicId: patient.clinicId } : (req.clinicId ? { clinicId: req.clinicId } : {})),
          $or: siblingOr
        };
        const siblings = await Patient.find(siblingQuery).sort({ updatedAt: -1 }).lean();
        const bestSibling =
          siblings.find(s => hasEnteredVaccineEntries(s.vaccines)) ||
          (vaccines.length === 0 ? siblings.find(s => Array.isArray(s.vaccines) && s.vaccines.length > 0) : null);
        if (bestSibling) {
          vaccines = bestSibling.vaccines;
        }
      }
    }

    res.json(vaccines);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vaccines', error: error.message });
  }
};

exports.savePatientVaccines = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { vaccines } = req.body;

    const patient = await resolvePatientRecord(patientId, req.clinicId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const cleanVaccines = Array.isArray(vaccines) ? vaccines : [];

    // Atomic update so unrelated optional/legacy Patient schema validations never block vaccine persistence
    const updatedPatient = await Patient.findByIdAndUpdate(
      patient._id,
      { $set: { vaccines: cleanVaccines } },
      { new: true }
    );

    broadcast('PATIENT_UPDATED', {
      _id: patient._id,
      patientId: patient.patientId,
      clinicId: patient.clinicId
    });

    res.json(updatedPatient?.vaccines || cleanVaccines);
  } catch (error) {
    res.status(500).json({ message: 'Error saving vaccines', error: error.message });
  }
};

exports.getVaccineTemplates = async (req, res) => {
  try {
    const templates = await VaccineTemplate.find({});
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

exports.saveVaccineTemplates = async (req, res) => {
  try {
    const { pediatric, maternal, other } = req.body;

    if (pediatric) {
      await VaccineTemplate.findOneAndUpdate({ type: 'Pediatric' }, { vaccines: pediatric }, { upsert: true });
    }
    if (maternal) {
      await VaccineTemplate.findOneAndUpdate({ type: 'Maternal' }, { vaccines: maternal }, { upsert: true });
    }
    if (other) {
      await VaccineTemplate.findOneAndUpdate({ type: 'Other' }, { vaccines: other }, { upsert: true });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error saving vaccine templates', error: error.message });
  }
};

exports.getPatientTests = async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1. Manually entered test results (via Visit Pad or Frontdesk)
    const testResults = await TestResult.find({ patient: patientId }).sort({ createdAt: 1 });

    // 2. Lab orders for this patient — look up patient UHID first
    const patient = await Patient.findById(patientId);
    const labOrderTests = [];
    if (patient && patient.patientId) {
      // Fetch all lab orders for the patient; we filter by Done test status below
      const labOrders = await LabOrder.find({
        clinicId: req.clinicId,
        uhid: patient.patientId
      }).sort({ orderedDate: 1 });

      for (const order of labOrders) {
        const completedTests = order.tests.filter(t => t.status === 'Done' && t.value);
        if (completedTests.length > 0) {
          const orderDate = order.sampleCollectedAt || order.orderedDate || order.createdAt;
          // Shape each lab order as a synthetic TestResult record
          labOrderTests.push({
            _id: `lab_${order._id}`,
            source: 'lab',
            orderId: order._id,
            tests: completedTests.map(t => ({
              date: orderDate,
              name: t.name,
              value: t.value,
              unit: t.unit || '',
              category: t.category || 'Lab'
            }))
          });
        }
      }
    }

    // Merge manual + lab results
    res.json([...testResults, ...labOrderTests]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient tests', error: error.message });
  }
};

exports.getAppointmentTests = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const testResult = await TestResult.findOne({ appointment: appointmentId });
    res.json(testResult || { tests: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment tests', error: error.message });
  }
};

exports.saveAppointmentTests = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const tests = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId }).populate('patient');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    let testResult = await TestResult.findOne({ appointment: appointmentId });

    if (!testResult) {
      testResult = new TestResult({
        userId: req.user._id,
        appointment: appointmentId,
        patient: appointment.patient,
        tests: tests
      });
    } else {
      testResult.tests = tests;
    }
    await testResult.save();

    // Sync back to LabOrders if they exist for this patient ON THIS EXACT DATE
    if (appointment.patient && appointment.patient.patientId) {
      const appointmentDate = new Date(appointment.date);
      const apptDateString = appointmentDate.toISOString().split('T')[0];

      const labOrders = await LabOrder.find({ uhid: appointment.patient.patientId, clinicId: req.clinicId });
      let labOrderUpdated = false;
      for (const order of labOrders) {
        const orderDate = new Date(order.sampleCollectedAt || order.orderedDate || order.createdAt);
        const orderDateString = orderDate.toISOString().split('T')[0];
        
        if (orderDateString === apptDateString) {
          let orderChanged = false;
          for (const test of tests) {
            const labTestItem = order.tests.find(t => t.name.toLowerCase() === test.name.toLowerCase());
            if (labTestItem) {
              if (labTestItem.value !== test.value) {
                labTestItem.value = test.value;
                if (test.value && labTestItem.status !== 'Done') {
                  labTestItem.status = 'Done';
                } else if (!test.value && labTestItem.status === 'Done') {
                  labTestItem.status = 'Pending';
                }
                orderChanged = true;
              }
            }
          }
          if (orderChanged) {
            await order.save();
            labOrderUpdated = true;
            broadcast('LABORDER_UPDATED', { action: 'updated', id: order._id });
          }
        }
      }
    }

    broadcast('TEST_RESULTS_SAVED', { appointmentId });

    res.json(testResult);
  } catch (error) {
    res.status(500).json({ message: 'Error saving test results', error: error.message });
  }
};

exports.getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    // Do NOT filter by userId — attachments for this patient may have been uploaded by
    // frontdesk staff (different userId). Return all attachments for the patient regardless of who uploaded them.
    const attachments = await Attachment.find({ patient: patientId }).sort({ uploadedAt: -1 });
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient documents', error: error.message });
  }
};

exports.uploadPatientDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Convert buffer to base64 data URL (serverless-safe, no disk needed)
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64}`;

    const attachment = new Attachment({
      userId: req.user._id,      // track who uploaded (doctor) for "My Docs" filter
      patient: patient._id,
      fileName: req.file.originalname,
      fileUrl,
    });
    await attachment.save();

    // Broadcast upload so queues refresh (they fetch on this event)
    broadcast('ATTACHMENT_UPLOADED', { patientId });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

exports.deletePatientDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    // Only allow deletion if the logged-in user uploaded it
    const attachment = await Attachment.findOneAndDelete({ _id: docId, userId: req.user._id });
    if (!attachment) return res.status(404).json({ message: 'Document not found or not authorised' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

exports.getAllLabResults = async (req, res) => {
  try {
    const results = await TestResult
      .find({ userId: req.user._id })
      .populate('patient', 'name age gender phone')
      .populate('appointment', 'date')
      .sort({ updatedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab results', error: error.message });
  }
};

exports.saveTemplate = async (req, res) => {
  try {
    const { name, section, data } = req.body;
    const template = await Template.findOneAndUpdate(
      { clinicId: req.clinicId, section, name },
      { data },
      { upsert: true, new: true }
    );
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error saving template', error: error.message });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { section } = req.query;
    const query = { clinicId: req.clinicId };
    if (section) query.section = section;
    const templates = await Template.find(query);

    // Format response to match previous local storage structure: { [name]: data }
    const store = {};
    templates.forEach(t => store[t.name] = t.data);
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { section, name } = req.query;
    await Template.findOneAndDelete({ clinicId: req.clinicId, section, name });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting template', error: error.message });
  }
};
