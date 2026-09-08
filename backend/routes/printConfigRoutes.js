const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  getAllTemplates,
  getPrintConfig,
  createTemplate,
  savePrintConfig,
  deleteTemplate,
  uploadHeaderImage,
  uploadFooterImage,
  clearImage
} = require('../controllers/printConfigController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }  // 5 MB max
});

// GET  /api/print-config/templates     → list all templates (name + id + isDefault)
router.get('/templates', protect, getAllTemplates);

// GET  /api/print-config               → get default template full data
// GET  /api/print-config/:id           → get specific template full data
router.get('/:id', protect, getPrintConfig);
router.get('/',    protect, getPrintConfig);

// POST /api/print-config               → create a new named template
router.post('/', protect, createTemplate);

// PUT  /api/print-config/:id           → save specific template
// PUT  /api/print-config               → save default template (legacy)
router.put('/:id', protect, savePrintConfig);
router.put('/',    protect, savePrintConfig);

// DELETE /api/print-config/:id         → delete a template
router.delete('/:id', protect, deleteTemplate);

// POST /api/print-config/header/:id    → upload header image for template
// POST /api/print-config/footer/:id    → upload footer image for template
router.post('/header/:id', protect, upload.single('file'), uploadHeaderImage);
router.post('/footer/:id', protect, upload.single('file'), uploadFooterImage);
router.post('/header',     protect, upload.single('file'), uploadHeaderImage);
router.post('/footer',     protect, upload.single('file'), uploadFooterImage);

// DELETE /api/print-config/image/:type/:id → clear image
router.delete('/image/:type/:id', protect, clearImage);
router.delete('/image/:type',     protect, clearImage);

module.exports = router;
