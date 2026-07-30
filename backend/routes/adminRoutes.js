const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getStaff, addStaff, 
  getReferralDoctors, addReferralDoctor, deleteReferralDoctor,
  getVendors, addVendor, deleteVendor 
} = require('../controllers/adminController');

// All admin routes are protected
router.use(protect);

// Staff Routes
router.route('/staff').get(getStaff).post(addStaff);

// Referral Doctor Routes
router.route('/referral-doctors').get(getReferralDoctors).post(addReferralDoctor);
router.route('/referral-doctors/:id').delete(deleteReferralDoctor);

// Vendor Routes
router.route('/vendors').get(getVendors).post(addVendor);
router.route('/vendors/:id').delete(deleteVendor);

module.exports = router;
