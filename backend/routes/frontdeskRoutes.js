const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { 
  getAppointments, createAppointment, updateAppointment, getBills, payBill, updateVitals, saveTestResults, getTestResults,
  uploadAttachment, getAttachments, updateAppointmentStatus, createBill, updateBill, updatePatient, searchPatients
} = require('../controllers/frontdeskController');

// Multer Config — use memoryStorage so no disk writes needed (works on Vercel/serverless)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All FrontDesk routes protected by auth
router.route('/appointments')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/appointments/:appointmentId')
  .put(protect, updateAppointment);

router.route('/appointments/:appointmentId/status')
  .put(protect, updateAppointmentStatus);

router.route('/appointments/:appointmentId/vitals')
  .post(protect, updateVitals);

router.route('/appointments/:appointmentId/tests')
  .get(protect, getTestResults)
  .post(protect, saveTestResults);

router.route('/appointments/:appointmentId/attachments')
  .get(protect, getAttachments)
  .post(protect, upload.single('file'), uploadAttachment);

router.route('/bills')
  .get(protect, getBills)
  .post(protect, createBill);

router.route('/bills/:billId')
  .put(protect, updateBill);

router.route('/bills/:billId/pay')
  .post(protect, payBill);

router.route('/patients/search')
  .get(protect, searchPatients);

router.route('/patients/:patientId')
  .put(protect, updatePatient);

module.exports = router;
