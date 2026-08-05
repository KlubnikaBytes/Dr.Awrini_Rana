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
  uploadMiddleware
} = require('../controllers/homeCareController');

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
