const express = require('express');
const router = express.Router();
const { registerUser, loginUser, loginDoctor, doctorMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/doctor-login', loginDoctor);
// Authenticated — returns current doctor info from DB (no localStorage needed)
router.get('/doctor-me', protect, doctorMe);

module.exports = router;
