const DayCare = require('../models/DayCare');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { broadcast } = require('../websocket');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `daycare_${Date.now()}_${file.originalname}`)
});
exports.uploadMiddleware = multer({ storage }).single('file');

exports.getAll = async (req, res) => {
  try {
    const records = await DayCare.find({ clinicId: req.clinicId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const r = new DayCare({ ...req.body, clinicId: req.clinicId, userId: req.user._id });
    await r.save();
    broadcast('DAYCARE_UPDATED', { action: 'created', id: r._id });
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const r = await DayCare.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, req.body, { new: true });
    if (!r) return res.status(404).json({ message: 'Not found' });
    broadcast('DAYCARE_UPDATED', { action: 'updated', id: r._id });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await DayCare.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    broadcast('DAYCARE_UPDATED', { action: 'deleted', id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.uploadDocument = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    r.documents.push({ fileName: req.file.originalname, fileUrl });
    await r.save();
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteDocument = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    r.documents = r.documents.filter(d => d._id.toString() !== req.params.docId);
    await r.save();
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};
