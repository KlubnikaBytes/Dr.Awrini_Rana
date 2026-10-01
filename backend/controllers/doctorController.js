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
    // Try with clinicId first (multi-tenant safety), fall back to name-only if not found
    let doctorProfile = await Staff.findOne({ ...nameQuery, clinicId: req.clinicId }).select('-password').lean();
    if (!doctorProfile) {
      doctorProfile = await Staff.findOne(nameQuery).select('-password').lean();
    }
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
    const mongoose = require('mongoose');

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

exports.getAllMedicines = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!req.clinicId) return res.json([]);

    const clinicId = new mongoose.Types.ObjectId(req.clinicId);
    const MedicineDirectory = require('../models/MedicineDirectory');

    let count = await MedicineDirectory.countDocuments({ clinicId });
    if (count === 0) {
      // Migrate existing medicines from Consultation
      const aggMedicines = await Consultation.aggregate([
        { $match: { clinicId: clinicId } },
        { $unwind: { path: "$medicines", preserveNullAndEmptyArrays: false } },
        { $sort: { createdAt: -1 } },
        {
          $match: {
            "medicines.medicineName": { $type: "string", $ne: "" }
          }
        },
        {
          $group: {
            _id: { $toLower: { $trim: { input: "$medicines.medicineName" } } },
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

      if (aggMedicines.length > 0) {
        const ops = aggMedicines.map(m => ({
          insertOne: {
            document: {
              clinicId,
              type: m.type,
              medicineName: m.medicineName,
              genericName: m.genericName,
              dosage: m.dosage,
              when: m.when,
              frequency: m.frequency,
              duration: m.duration,
              notes: m.notes,
              instructions: m.instructions
            }
          }
        }));
        await MedicineDirectory.bulkWrite(ops, { ordered: false });
      }
    }

    const medicines = await MedicineDirectory.find({ clinicId, isDeleted: false }).sort({ medicineName: 1 });
    res.json(medicines);
  } catch (error) {
    console.error('[getAllMedicines]', error);
    res.status(500).json({ message: 'Error fetching medicines', error: error.message });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    if (!req.clinicId) return res.status(400).json({ message: 'No clinic found' });

    const medicine = req.body;
    if (!medicine.medicineName) return res.status(400).json({ message: 'Medicine name required' });

    // Check if it already exists (and is not deleted)
    const existing = await MedicineDirectory.findOne({
      clinicId: req.clinicId,
      medicineName: { $regex: new RegExp(`^${medicine.medicineName}$`, 'i') },
      isDeleted: false
    });

    if (existing) {
      return res.status(400).json({ message: 'Medicine already added' });
    }

    const result = await MedicineDirectory.findOneAndUpdate(
      { clinicId: req.clinicId, medicineName: medicine.medicineName },
      { $set: { ...medicine, isDeleted: false } },
      { upsert: true, new: true }
    );

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

    if (medicine.medicineName) {
      // Check if new name conflicts with another existing active medicine
      const existing = await MedicineDirectory.findOne({
        clinicId: req.clinicId,
        medicineName: { $regex: new RegExp(`^${medicine.medicineName}$`, 'i') },
        isDeleted: false,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Medicine already added' });
      }
    }

    const result = await MedicineDirectory.findOneAndUpdate(
      { _id: id, clinicId: req.clinicId },
      { $set: medicine },
      { new: true }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating medicine', error: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const MedicineDirectory = require('../models/MedicineDirectory');
    const { id } = req.params;

    await MedicineDirectory.findOneAndUpdate(
      { _id: id, clinicId: req.clinicId },
      { $set: { isDeleted: true } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting medicine', error: error.message });
  }
};

exports.getClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const Suggestion = require('../models/Suggestion');
    const { type } = req.query;
    if (!type || !req.clinicId) return res.json([]);

    let count = await ClinicDirectory.countDocuments({ clinicId: req.clinicId, type });
    if (count === 0) {
      // Migrate from Consultation if empty
      const Consultation = require('../models/Consultation');
      const consultations = await Consultation.find({ clinicId: req.clinicId }).lean();

      const uniqueTexts = new Set();

      consultations.forEach(c => {
        const addTexts = (val) => {
          if (!val) return;
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (typeof item === 'string' && item.trim()) uniqueTexts.add(item.trim().toUpperCase());
              else if (typeof item === 'object' && item.testName) uniqueTexts.add(item.testName.trim().toUpperCase());
            });
          } else if (typeof val === 'string') {
            const lines = val.split('\n');
            lines.forEach(line => {
              if (line.trim()) uniqueTexts.add(line.trim().toUpperCase());
            });
          }
        };

        if (type === 'COMPLAINT') addTexts(c.complaints);
        else if (type === 'DIAGNOSIS') addTexts(c.diagnosis);
        else if (type === 'TEST') addTexts(c.testsRequested);
        else if (type === 'PAST_HISTORY') addTexts(c.pastHistory);
        else if (type === 'PHYSICAL_EXAM') addTexts(c.physicalExamination);
        else if (type === 'ADVICE') addTexts(c.advice);
        else if (type === 'PERSONAL_HISTORY') addTexts(c.historyDetails?.personalHistory);
        else if (type === 'PAST_MEDICATION') addTexts(c.pastMedications);
      });

      if (uniqueTexts.size > 0) {
        const ops = Array.from(uniqueTexts).map(text => ({
          updateOne: {
            filter: { clinicId: req.clinicId, type, text },
            update: { $setOnInsert: { clinicId: req.clinicId, type, text, isDeleted: false } },
            upsert: true
          }
        }));
        try {
          await ClinicDirectory.bulkWrite(ops, { ordered: false });
        } catch (err) { }
      }
    }

    const entries = await ClinicDirectory.find({ clinicId: req.clinicId, type, isDeleted: false }).sort({ text: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching directory', error: error.message });
  }
};

exports.addClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const { type, text } = req.body;
    if (!type || !text || !req.clinicId) return res.status(400).json({ message: 'Invalid data' });

    const existing = await ClinicDirectory.findOne({
      clinicId: req.clinicId, type, text: { $regex: new RegExp(`^${text}$`, 'i') }, isDeleted: false
    });
    if (existing) return res.status(400).json({ message: 'Entry already exists' });

    const result = await ClinicDirectory.findOneAndUpdate(
      { clinicId: req.clinicId, type, text: text.trim().toUpperCase() },
      { $set: { isDeleted: false } },
      { upsert: true, new: true }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error adding entry', error: error.message });
  }
};

exports.updateClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    const { id } = req.params;
    const { text } = req.body;

    const existing = await ClinicDirectory.findOne({
      clinicId: req.clinicId, type: req.body.type, text: { $regex: new RegExp(`^${text}$`, 'i') }, isDeleted: false, _id: { $ne: id }
    });
    if (existing) return res.status(400).json({ message: 'Entry already exists' });

    const result = await ClinicDirectory.findOneAndUpdate(
      { _id: id, clinicId: req.clinicId },
      { $set: { text: text.trim().toUpperCase() } },
      { new: true }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error: error.message });
  }
};

exports.deleteClinicDirectory = async (req, res) => {
  try {
    const ClinicDirectory = require('../models/ClinicDirectory');
    await ClinicDirectory.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { $set: { isDeleted: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting entry', error: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { type, q } = req.query;
    if (!type) return res.status(400).json({ message: 'Type is required' });

    let suggestions = [];
    const escapedQ = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    if (type === 'MEDICINE') {
      const MedicineDirectory = require('../models/MedicineDirectory');
      let dirQuery = { clinicId: req.clinicId, isDeleted: false };
      if (q) dirQuery.medicineName = { $regex: new RegExp('^' + escapedQ, 'i') };
      const medDir = await MedicineDirectory.find(dirQuery).sort({ medicineName: 1 }).limit(100);
      suggestions = medDir.map(m => m.medicineName);
    } else {
      const ClinicDirectory = require('../models/ClinicDirectory');

      // Auto-migrate from Consultation if empty
      let count = await ClinicDirectory.countDocuments({ clinicId: req.clinicId, type });
      if (count === 0) {
        const Consultation = require('../models/Consultation');
        const consultations = await Consultation.find({ clinicId: req.clinicId }).lean();
        const uniqueTexts = new Set();

        consultations.forEach(c => {
          const addTexts = (val) => {
            if (!val) return;
            if (Array.isArray(val)) {
              val.forEach(item => {
                if (typeof item === 'string' && item.trim()) uniqueTexts.add(item.trim().toUpperCase());
                else if (typeof item === 'object' && item.testName) uniqueTexts.add(item.testName.trim().toUpperCase());
              });
            } else if (typeof val === 'string') {
              const lines = val.split('\n');
              lines.forEach(line => {
                if (line.trim()) uniqueTexts.add(line.trim().toUpperCase());
              });
            }
          };

          if (type === 'COMPLAINT') addTexts(c.complaints);
          else if (type === 'DIAGNOSIS') addTexts(c.diagnosis);
          else if (type === 'TEST') addTexts(c.testsRequested);
          else if (type === 'PAST_HISTORY') addTexts(c.pastHistory);
          else if (type === 'PHYSICAL_EXAM') addTexts(c.physicalExamination);
          else if (type === 'ADVICE') addTexts(c.advice);
          else if (type === 'PERSONAL_HISTORY') addTexts(c.historyDetails?.personalHistory);
          else if (type === 'PAST_MEDICATION') addTexts(c.pastMedications);
        });

        if (uniqueTexts.size > 0) {
          const ops = Array.from(uniqueTexts).map(text => ({
            updateOne: {
              filter: { clinicId: req.clinicId, type, text },
              update: { $setOnInsert: { clinicId: req.clinicId, type, text, isDeleted: false } },
              upsert: true
            }
          }));
          try {
            await ClinicDirectory.bulkWrite(ops, { ordered: false });
          } catch (err) { }
        }
      }

      let dirQuery = { clinicId: req.clinicId, type, isDeleted: false };
      if (q) dirQuery.text = { $regex: new RegExp('^' + escapedQ, 'i') };
      const clinicDir = await ClinicDirectory.find(dirQuery).sort({ text: 1 }).limit(100);
      suggestions = clinicDir.map(c => c.text);
    }

    // Merge with personal suggestions for backward compatibility
    let query = { userId: req.user._id, type };
    if (req.clinicId) query.clinicId = req.clinicId;
    if (q) query.text = { $regex: new RegExp('^' + escapedQ, 'i') };
    const personalSuggestions = await Suggestion.find(query).sort({ text: 1 }).limit(100);

    const combined = [...new Set([...suggestions, ...personalSuggestions.map(s => s.text)])];
    res.json(combined.slice(0, 100));
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
        const text = tag.trim().toUpperCase();

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
            filter: { clinicId: req.clinicId, type, text },
            update: { $set: { clinicId: req.clinicId, type, text, isDeleted: false } },
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

      // Upsert full medicine details into MedicineDirectory
      const medicineDirectoryOps = [];
      const MedicineDirectory = require('../models/MedicineDirectory');
      for (const m of data.medicines) {
        if (!m.medicineName || !m.medicineName.trim()) continue;
        const medName = m.medicineName.trim().toUpperCase();

        // Build the update object with only fields that are provided
        const setObj = { clinicId: req.clinicId, medicineName: medName, isDeleted: false };
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
            filter: { clinicId: req.clinicId, medicineName: medName },
            update: { $set: setObj },
            upsert: true
          }
        });
      }

      if (medicineDirectoryOps.length > 0) {
        try {
          await MedicineDirectory.bulkWrite(medicineDirectoryOps, { ordered: false });
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

    // Sync with MedicineDirectory
    if (data.medicines && Array.isArray(data.medicines)) {
      const MedicineDirectory = require('../models/MedicineDirectory');
      const medDirOps = data.medicines.map(m => {
        if (!m.medicineName || !m.medicineName.trim()) return null;
        return {
          updateOne: {
            filter: { clinicId: req.clinicId, medicineName: m.medicineName },
            update: {
              $set: {
                type: m.type,
                genericName: m.genericName,
                dosage: m.dosage,
                when: m.when,
                frequency: m.frequency,
                duration: m.duration,
                notes: m.notes,
                instructions: m.instructions,
                isDeleted: false
              }
            },
            upsert: true
          }
        };
      }).filter(Boolean);

      if (medDirOps.length > 0) {
        try {
          await MedicineDirectory.bulkWrite(medDirOps, { ordered: false });
        } catch (err) { }
      }
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

    // First, try to find an exact match in the MedicineDirectory
    let bestMatch = await MedicineDirectory.findOne({
      clinicId: req.clinicId,
      medicineName: exactName.toUpperCase(),
      isDeleted: false
    });

    // If no exact match, try case-insensitive regex
    if (!bestMatch) {
      const escapedName = exactName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      bestMatch = await MedicineDirectory.findOne({
        clinicId: req.clinicId,
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

exports.getPatientVaccines = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient.vaccines || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vaccines', error: error.message });
  }
};

exports.savePatientVaccines = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { vaccines } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient.vaccines = vaccines;
    await patient.save();

    res.json(patient.vaccines);
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

    // 1. Manually entered test results (via Visit Pad)
    const testResults = await TestResult.find({ patient: patientId, userId: req.user._id }).sort({ createdAt: 1 });

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
    const testResult = await TestResult.findOne({ appointment: appointmentId, userId: req.user._id });
    res.json(testResult || { tests: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment tests', error: error.message });
  }
};

exports.saveAppointmentTests = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const tests = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    let testResult = await TestResult.findOne({ appointment: appointmentId, userId: req.user._id });

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
