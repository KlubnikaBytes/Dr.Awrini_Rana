const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { 
  getAppointments, createAppointment, getBills, payBill, updateVitals, saveTestResults, getTestResults,
  uploadAttachment, getAttachments, updateAppointmentStatus, createBill, updateBill
} = require('../controllers/frontdeskController');

// Multer Config
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// All FrontDesk routes protected by auth
router.route('/appointments')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

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

module.exports = router;
