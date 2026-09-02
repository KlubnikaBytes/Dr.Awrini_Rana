const express = require('express');
const router = express.Router();
const { getBillingReport, getCareAnalytics, getReferralAnalytics } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/billing').get(getBillingReport);
router.route('/care-analytics').get(getCareAnalytics);
router.route('/referrals').get(getReferralAnalytics);

module.exports = router;
