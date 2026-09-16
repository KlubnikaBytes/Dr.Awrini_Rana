const express = require('express');
const router = express.Router();
const { getBillingReport, getCareAnalytics, getReferralAnalytics, getMedicineHistory, updateMedicineMeta, getAnalyticsPatients, getMedicinePatients } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/billing').get(getBillingReport);
router.route('/care-analytics').get(getCareAnalytics);
router.route('/referrals').get(getReferralAnalytics);
router.route('/medicine-history').get(getMedicineHistory);
router.route('/medicine-meta').post(updateMedicineMeta);
router.route('/analytics-patients').get(getAnalyticsPatients);
router.route('/medicine-patients').get(getMedicinePatients);
module.exports = router;
