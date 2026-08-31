const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserClinics,
  getAllClinics,
  createClinic,
  updateClinic,
  deleteClinic,
  uploadLogoMiddleware,
  uploadClinicLogo,
  removeClinicLogo
} = require('../controllers/clinicController');

router.use(protect);

router.get('/my', getUserClinics);
router.get('/', getAllClinics);
router.post('/', createClinic);
router.put('/:id', updateClinic);
router.delete('/:id', deleteClinic);
router.post('/:id/logo', uploadLogoMiddleware, uploadClinicLogo);
router.delete('/:id/logo', removeClinicLogo);

module.exports = router;
