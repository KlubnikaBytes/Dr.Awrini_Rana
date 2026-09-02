const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const billController = require('../controllers/billController');

router.use(protect);

router.get('/patient/:patientId', billController.getPatientBills);
router.post('/merge-pay', billController.mergeAndPayBills);

module.exports = router;
