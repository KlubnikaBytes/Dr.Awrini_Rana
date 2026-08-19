const HomeCare = require('../models/HomeCare');
const Counter = require('../models/Counter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { broadcast } = require('../websocket');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `homecare_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

exports.uploadMiddleware = upload.single('file');

// GET all home care records for this clinic
exports.getHomeCareRecords = async (req, res) => {
  try {
    const records = await HomeCare.find({ clinicId: req.clinicId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching home care records', error: error.message });
  }
};

// GET single record
exports.getHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching record', error: error.message });
  }
};

// POST create new record
exports.createHomeCareRecord = async (req, res) => {
  try {
    const body = { ...req.body, clinicId: req.clinicId, userId: req.user._id };
    // Auto-assign uhid if not provided (walk-in homecare patient)
    if (!body.uhid) {
      body.uhid = await Counter.nextId();
    }
    const record = new HomeCare(body);
    await record.save();
    broadcast('HOMECARE_UPDATED', { action: 'created', id: record._id });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error creating home care record', error: error.message });
  }
};

// PUT update record
exports.updateHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    broadcast('HOMECARE_UPDATED', { action: 'updated', id: req.params.id });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating record', error: error.message });
  }
};

// DELETE record
exports.deleteHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    broadcast('HOMECARE_UPDATED', { action: 'deleted', id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting record', error: error.message });
  }
};

// POST upload document to a home care record
exports.uploadDocument = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    record.documents.push({ fileName: req.file.originalname, fileUrl });
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// DELETE a document from a record
exports.deleteDocument = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    record.documents = record.documents.filter(d => d._id.toString() !== req.params.docId);
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};
