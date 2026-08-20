const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/dayCareController');

// Billing routes MUST come before /:id to avoid 'bills' matching as an id
router.route('/bills').get(protect, ctrl.getBills).post(protect, ctrl.createBill);
router.route('/bills/:billId').put(protect, ctrl.updateBill);
router.route('/bills/:billId/pay').post(protect, ctrl.payBill);

router.route('/').get(protect, ctrl.getAll).post(protect, ctrl.create);
router.route('/:id').get(protect, ctrl.getById).put(protect, ctrl.update).delete(protect, ctrl.remove);
router.post('/:id/documents', protect, ctrl.uploadMiddleware, ctrl.uploadDocument);
router.delete('/:id/documents/:docId', protect, ctrl.deleteDocument);

module.exports = router;
