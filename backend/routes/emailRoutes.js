const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer to store file in memory temporarily
const upload = multer({ storage: multer.memoryStorage() });

// Route to send email
router.post('/send', protect, upload.single('file'), emailController.sendEmail);

module.exports = router;
