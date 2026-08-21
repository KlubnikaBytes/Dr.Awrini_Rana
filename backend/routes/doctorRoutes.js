const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getConsultation, saveConsultation, getSuggestions, getMedicineDetails, getPastConsultations, saveTemplate, getTemplates, deleteTemplate } = require('../controllers/doctorController');

router.route('/suggestions')
  .get(protect, getSuggestions);

router.route('/medicine-details')
  .get(protect, getMedicineDetails);

router.route('/patient/:patientId/past-consultations')
  .get(protect, getPastConsultations);

router.route('/consultation/:appointmentId')
  .get(protect, getConsultation)
  .post(protect, saveConsultation);

const multer = require('multer');
const { 
  getPatientVaccines, savePatientVaccines, 
  getVaccineTemplates, saveVaccineTemplates,
  getPatientTests, saveAppointmentTests, getAppointmentTests,
  getPatientDocuments, uploadPatientDocument, deletePatientDocument, getAllLabResults
} = require('../controllers/doctorController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.route('/patient/:patientId/vaccines')
  .get(protect, getPatientVaccines)
  .post(protect, savePatientVaccines);

router.route('/vaccine-templates')
  .get(protect, getVaccineTemplates)
  .post(protect, saveVaccineTemplates);

router.route('/patient/:patientId/tests')
  .get(protect, getPatientTests);

router.route('/appointment/:appointmentId/tests')
  .get(protect, getAppointmentTests)
  .post(protect, saveAppointmentTests);

router.route('/patient/:patientId/documents')
  .get(protect, getPatientDocuments)
  .post(protect, upload.single('file'), uploadPatientDocument);

router.route('/patient/:patientId/documents/:docId')
  .delete(protect, deletePatientDocument);

router.route('/lab/results')
  .get(protect, getAllLabResults);

router.route('/templates')
  .get(protect, getTemplates)
  .post(protect, saveTemplate)
  .delete(protect, deleteTemplate);

module.exports = router;
