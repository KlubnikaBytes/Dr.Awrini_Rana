const express = require('express');
const router = express.Router();
const { getBillingReport, getCareAnalytics, getReferralAnalytics, getMedicineHistory, updateMedicineMeta, getTestPatients, getMedicinePatients } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/billing').get(getBillingReport);
router.route('/care-analytics').get(getCareAnalytics);
router.route('/referrals').get(getReferralAnalytics);
router.route('/medicine-history').get(getMedicineHistory);
router.route('/medicine-meta').post(updateMedicineMeta);
router.route('/test-patients').get(getTestPatients);
router.route('/medicine-patients').get(getMedicinePatients);
module.exports = router;
