const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getStaff, addStaff, updateStaff, deleteStaff,
  getReferralDoctors, addReferralDoctor, deleteReferralDoctor,
  getVendors, addVendor, deleteVendor,
  getLabCatalog, addLabCategory, updateLabCategory, deleteLabCategory,
  getTieUpOrgs, addTieUpOrg, updateTieUpOrg, deleteTieUpOrg
} = require('../controllers/adminController');

// All admin routes are protected
router.use(protect);

// Staff Routes
router.route('/staff').get(getStaff).post(addStaff);
router.route('/staff/:id').put(updateStaff).delete(deleteStaff);

// Referral Doctor Routes
router.route('/referral-doctors').get(getReferralDoctors).post(addReferralDoctor);
router.route('/referral-doctors/:id').delete(deleteReferralDoctor);

// Vendor Routes
router.route('/vendors').get(getVendors).post(addVendor);
router.route('/vendors/:id').delete(deleteVendor);

// Lab Catalog Routes
router.route('/lab-catalog').get(getLabCatalog).post(addLabCategory);
router.route('/lab-catalog/:id').put(updateLabCategory).delete(deleteLabCategory);

// Tie-Up Orgs Routes
router.route('/tie-up-orgs').get(getTieUpOrgs).post(addTieUpOrg);
router.route('/tie-up-orgs/:id').put(updateTieUpOrg).delete(deleteTieUpOrg);

module.exports = router;
