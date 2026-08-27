const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUserClinics, getAllClinics, createClinic, updateClinic, deleteClinic } = require('../controllers/clinicController');

router.use(protect);

router.get('/my', getUserClinics);
router.get('/', getAllClinics);
router.post('/', createClinic);
router.put('/:id', updateClinic);
router.delete('/:id', deleteClinic);

module.exports = router;
