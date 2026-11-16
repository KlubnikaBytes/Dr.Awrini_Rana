const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { 
  getAppointments, createAppointment, updateAppointment, getBills, payBill, updateVitals, saveTestResults, getTestResults,
  uploadAttachment, getAttachments, updateAppointmentStatus, createBill, updateBill, updatePatient, createPatient, searchPatients,
  uploadPatientPhoto, getUpcomingNotifications, deleteBill, deletePayment, deleteAppointment,
  getPublicMeetingInfo, updatePublicMeetingContact,
  getPublicMeetingWaiting, patientKnockMeeting, getPatientMeetingStatus,
  admitMeetingPatient, declineMeetingPatient
} = require('../controllers/frontdeskController');

// Multer Config — use memoryStorage so no disk writes needed (works on Vercel/serverless)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Public Meet Endpoints (No auth needed for patients) ──────────────
router.get('/public/meet/:appointmentId', getPublicMeetingInfo);
router.post('/public/meet/:appointmentId/contact', updatePublicMeetingContact);
router.get('/public/meet/:appointmentId/waiting', getPublicMeetingWaiting);
router.post('/public/meet/:appointmentId/knock', patientKnockMeeting);
router.get('/public/meet/:appointmentId/patient-status', getPatientMeetingStatus);
router.post('/public/meet/:appointmentId/admit', admitMeetingPatient);
router.post('/public/meet/:appointmentId/decline', declineMeetingPatient);

// All FrontDesk routes protected by auth
router.route('/notifications/upcoming')
  .get(protect, getUpcomingNotifications);

router.route('/appointments')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/appointments/:appointmentId')
  .put(protect, updateAppointment)
  .delete(protect, deleteAppointment);

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
  .put(protect, updateBill)
  .delete(protect, deleteBill);

router.route('/bills/:billId/pay')
  .post(protect, payBill);

router.route('/bills/:billId/pay/:paymentId')
  .delete(protect, deletePayment);

router.route('/patients')
  .post(protect, createPatient);

router.route('/patients/search')
  .get(protect, searchPatients);

router.route('/patients/:patientId')
  .put(protect, updatePatient);


router.route('/patients/:patientId/photo')
  .post(protect, upload.single('photo'), uploadPatientPhoto);

module.exports = router;
