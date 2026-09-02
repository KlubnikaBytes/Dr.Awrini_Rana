const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const VaccineTemplate = require('../models/VaccineTemplate');
const Template = require('../models/Template');
const TestResult = require('../models/TestResult');
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

    const doctorProfile = await Staff.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${safeDocName}$`, 'i') } },
        { name: { $regex: new RegExp(`^Dr\\.?\\s*${safeDocName}$`, 'i') } }
      ],
      role: 'Doctor'
    }).select('-password').lean();
    if (!consultation) {
      // Return a blank template
      consultation = {
        appointment: appointmentId,
        patient: appointment.patient,
        vitals: appointment.vitals || {},
        complaints: [],
        pastHistory: '',
        physicalExamination: '',
        diagnosis: [],
        medicines: [],
        advice: '',
        testsRequested: [],
        nextVisit: { value: '', unit: '' },
        doctor: doctorProfile || null
      };
    } else {
       // Attach patient info and doctor profile for the frontend header
       consultation = consultation.toObject();
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
    // Fetch all consultations for this patient by this doctor, sorted by most recent first
    const consultations = await Consultation.find({ patient: patientId, clinicId: req.clinicId })
      .sort({ createdAt: -1 })
      .populate('appointment')
      .populate('patient');
      
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching past consultations', error: error.message });
  }
};

const Suggestion = require('../models/Suggestion');

exports.getSuggestions = async (req, res) => {
  try {
    const { type, q } = req.query;
    if (!type) return res.status(400).json({ message: 'Type is required' });

    let query = { userId: req.user._id, type };
    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.text = { $regex: new RegExp(escapedQ, 'i') };
    }

    const suggestions = await Suggestion.find(query).limit(20).sort({ text: 1 });
    res.json(suggestions.map(s => s.text));
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
    const nv = consultation.nextVisit;
    if (nv) {
      let followUpDate = null;
      if (nv.date) {
        // Doctor picked a specific date
        followUpDate = new Date(nv.date);
      } else if (nv.value && nv.unit) {
        const val = parseInt(nv.value, 10);
        if (!isNaN(val) && val > 0) {
          followUpDate = new Date();
          if (nv.unit === 'Days')   followUpDate.setDate(followUpDate.getDate() + val);
          if (nv.unit === 'Weeks')  followUpDate.setDate(followUpDate.getDate() + val * 7);
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
              doctorName: originalAppointment.doctorName,
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
    }

    // Accumulate all tags into a single bulkWrite operation to prevent DB connection exhaustion during autosave
    const suggestionOps = [];

    const addTagsToOps = (tags, type) => {
      if (!tags || !Array.isArray(tags)) return;
      for (const tag of tags) {
        if (!tag || typeof tag !== 'string' || !tag.trim()) continue;
        const text = tag.trim().toUpperCase();
        suggestionOps.push({
          updateOne: {
            filter: { userId: req.user._id, type, text },
            update: { $setOnInsert: { userId: req.user._id, type, text } },
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
    if (data.referredTo && data.referredTo.doctorName) {
      addTagsToOps([data.referredTo.doctorName], 'REFERRED_DOCTOR');
    }
    
    if (data.pastMedications && data.pastMedications.length > 0) {
      addTagsToOps(data.pastMedications, 'MEDICINE');
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
    }

    if (suggestionOps.length > 0) {
      // Execute all upserts in one database roundtrip
      try {
        await Suggestion.bulkWrite(suggestionOps, { ordered: false });
      } catch (err) {
        // Ignore bulkWrite duplicate key errors
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
    
    // Find recent consultations by this doctor that have this medicine name
    const consultations = await Consultation.find({ 
      userId: req.user._id, 
      'medicines.medicineName': { $regex: new RegExp(`^${name}$`, 'i') } 
    }).sort({ updatedAt: -1 }).limit(20);

    if (!consultations || consultations.length === 0) return res.json(null);

    let bestMatch = null;
    let maxFields = -1;

    for (const consultation of consultations) {
      const medicines = consultation.medicines.filter(m => 
        m.medicineName && m.medicineName.toLowerCase() === name.toLowerCase()
      );
      
      for (const m of medicines) {
        let fieldCount = 0;
        if (m.dosage) fieldCount++;
        if (m.when) fieldCount++;
        if (m.frequency) fieldCount++;
        if (m.duration) fieldCount++;
        if (m.notes) fieldCount++;
        
        // If we found a fully populated one, return immediately
        if (fieldCount >= 4) {
          return res.json(m);
        }
        
        if (fieldCount > maxFields) {
          maxFields = fieldCount;
          bestMatch = m;
        }
      }
    }
    
    res.json(bestMatch || null);
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
    const testResults = await TestResult.find({ patient: patientId, userId: req.user._id }).sort({ createdAt: 1 });
    res.json(testResults);
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
