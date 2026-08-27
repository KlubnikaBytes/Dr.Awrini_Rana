const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const VaccineTemplate = require('../models/VaccineTemplate');
const Template = require('../models/Template');
const TestResult = require('../models/TestResult');
const Attachment = require('../models/Attachment');
const Staff = require('../models/Staff');

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

    const doctorProfile = await Staff.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanDocName}$`, 'i') } },
        { name: { $regex: new RegExp(`^Dr\\.?\\s*${cleanDocName}$`, 'i') } }
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
      query.text = { $regex: new RegExp('^' + q, 'i') };
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
    
    if (!consultation) {
      consultation = new Consultation({
        userId: req.user._id,
        clinicId: req.clinicId,
        appointment: appointmentId,
        patient: appointment.patient,
        ...data
      });
    } else {
      // Update fields
      consultation.vitals = data.vitals !== undefined ? data.vitals : consultation.vitals;
      consultation.complaints = data.complaints !== undefined ? data.complaints : consultation.complaints;
      consultation.pastHistory = data.pastHistory !== undefined ? data.pastHistory : consultation.pastHistory;
      consultation.physicalExamination = data.physicalExamination !== undefined ? data.physicalExamination : consultation.physicalExamination;
      consultation.diagnosis = data.diagnosis !== undefined ? data.diagnosis : consultation.diagnosis;
      consultation.medicines = data.medicines !== undefined ? data.medicines : consultation.medicines;
      consultation.advice = data.advice !== undefined ? data.advice : consultation.advice;
      consultation.testsRequested = data.testsRequested !== undefined ? data.testsRequested : consultation.testsRequested;
      consultation.nextVisit = data.nextVisit !== undefined ? data.nextVisit : consultation.nextVisit;
    }
    
    await consultation.save();

    // Auto-save new suggestions
    const saveTags = async (tags, type) => {
      if (!tags || !Array.isArray(tags)) return;
      for (const tag of tags) {
        if (!tag.trim()) continue;
        const text = tag.trim().toUpperCase();
        try {
          await Suggestion.updateOne(
            { userId: req.user._id, type, text },
            { $setOnInsert: { userId: req.user._id, type, text } },
            { upsert: true }
          );
        } catch (err) {
          // Ignore duplicate key errors if they occur despite upsert
        }
      }
    };

    await saveTags(data.complaints, 'COMPLAINT');
    await saveTags(data.diagnosis, 'DIAGNOSIS');
    if (data.testsRequested && Array.isArray(data.testsRequested)) {
      const testNames = data.testsRequested.map(t => typeof t === 'string' ? t : t.testName).filter(Boolean);
      await saveTags(testNames, 'TEST');
    }
    if (data.referredTo && data.referredTo.doctorName) {
      await saveTags([data.referredTo.doctorName], 'REFERRED_DOCTOR');
    }
    
    if (data.pastMedications && data.pastMedications.length > 0) {
      await saveTags(data.pastMedications, 'MEDICINE');
    }
    
    if (data.historyDetails) {
      if (data.historyDetails.allergies) await saveTags(data.historyDetails.allergies, 'ALLERGIES');
      if (data.historyDetails.personalHistory) await saveTags(data.historyDetails.personalHistory, 'PERSONAL_HISTORY');
      if (data.historyDetails.pastMedicalHistory) await saveTags(data.historyDetails.pastMedicalHistory, 'PAST_MEDICAL_HISTORY');
      if (data.historyDetails.familyHistory) await saveTags(data.historyDetails.familyHistory, 'FAMILY_HISTORY');
    }

    const saveTextBlocks = async (text, type) => {
      if (!text || typeof text !== 'string') return;
      const lines = text.split('\n');
      await saveTags(lines, type);
    };

    await saveTextBlocks(data.pastHistory, 'PAST_HISTORY');
    await saveTextBlocks(data.physicalExamination, 'PHYSICAL_EXAM');
    await saveTextBlocks(data.advice, 'ADVICE');
    
    if (data.medicines && Array.isArray(data.medicines)) {
      const uniqueDosages = [...new Set(data.medicines.map(m => m.dosage).filter(Boolean))];
      await saveTags(uniqueDosages, 'DOSAGE');
      
      const uniqueMedicines = [...new Set(data.medicines.map(m => m.medicineName).filter(Boolean))];
      await saveTags(uniqueMedicines, 'MEDICINE');
      
      const uniqueGenerics = [...new Set(data.medicines.map(m => m.genericName).filter(Boolean))];
      await saveTags(uniqueGenerics, 'GENERIC_NAME');
      
      const uniqueWhens = [...new Set(data.medicines.map(m => m.when).filter(Boolean))];
      await saveTags(uniqueWhens, 'WHEN');
      
      const uniqueFrequencies = [...new Set(data.medicines.map(m => m.frequency).filter(Boolean))];
      await saveTags(uniqueFrequencies, 'FREQUENCY');
      
      const uniqueDurations = [...new Set(data.medicines.map(m => m.duration).filter(Boolean))];
      await saveTags(uniqueDurations, 'DURATION');
      
      const uniqueNotes = [...new Set(data.medicines.map(m => m.notes).filter(Boolean))];
      await saveTags(uniqueNotes, 'NOTES');
    }
    
    // Optionally update the appointment vitals too if they were changed here
    if (data.vitals) {
        appointment.vitals = data.vitals;
        // if the user wants auto-complete on save, uncomment below
        // appointment.status = 'REVIEWED';
        await appointment.save();
    }

    res.json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Error saving consultation', error: error.message });
  }
};

exports.getMedicineDetails = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.json(null);
    
    // Find the most recent consultation by this doctor that has this medicine name
    const consultation = await Consultation.findOne({ 
      userId: req.user._id, 
      'medicines.medicineName': { $regex: new RegExp(`^${name}$`, 'i') } 
    }).sort({ createdAt: -1 });

    if (!consultation) return res.json(null);

    // Find the specific medicine within that consultation
    const medicine = consultation.medicines.find(m => 
      m.medicineName && m.medicineName.toLowerCase() === name.toLowerCase()
    );
    
    res.json(medicine || null);
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
