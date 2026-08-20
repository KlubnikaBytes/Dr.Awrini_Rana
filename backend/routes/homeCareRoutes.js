const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getHomeCareRecords,
  getHomeCareRecord,
  createHomeCareRecord,
  updateHomeCareRecord,
  deleteHomeCareRecord,
  uploadDocument,
  deleteDocument,
  uploadMiddleware,
  getBills,
  createBill,
  updateBill,
  payBill
} = require('../controllers/homeCareController');

// Billing routes MUST come before /:id to avoid 'bills' matching as an id
router.route('/bills').get(protect, getBills).post(protect, createBill);
router.route('/bills/:billId').put(protect, updateBill);
router.route('/bills/:billId/pay').post(protect, payBill);

router.route('/')
  .get(protect, getHomeCareRecords)
  .post(protect, createHomeCareRecord);

router.route('/:id')
  .get(protect, getHomeCareRecord)
  .put(protect, updateHomeCareRecord)
  .delete(protect, deleteHomeCareRecord);

router.post('/:id/documents', protect, uploadMiddleware, uploadDocument);
router.delete('/:id/documents/:docId', protect, deleteDocument);

module.exports = router;
