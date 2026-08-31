const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Clinic = require('../models/Clinic');
const User = require('../models/User');

// ── Multer storage for clinic logos ──────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/clinic-logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `clinic-logo-${Date.now()}${ext}`);
  }
});

const logoFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed for clinic logos'), false);
};

exports.uploadLogoMiddleware = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}).single('logo');

// ── Controllers ───────────────────────────────────────────────────────────────

exports.getUserClinics = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('clinics');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.clinics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clinics' });
  }
};

exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find();
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clinics' });
  }
};

exports.createClinic = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const clinic = await Clinic.create({ name, address, phone, email });
    
    // Add to current user's clinics
    await User.findByIdAndUpdate(req.user._id, { $push: { clinics: clinic._id } });

    res.status(201).json(clinic);
  } catch (error) {
    res.status(500).json({ message: 'Error creating clinic' });
  }
};

exports.updateClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(clinic);
  } catch (error) {
    res.status(500).json({ message: 'Error updating clinic' });
  }
};

exports.deleteClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    // Delete logo file if it exists
    if (clinic?.logo) {
      const logoPath = path.join(__dirname, '../', clinic.logo.replace(/^\/uploads\//, 'uploads/'));
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }
    await Clinic.findByIdAndDelete(req.params.id);
    // Also remove from all users who have this clinic
    await User.updateMany({ clinics: req.params.id }, { $pull: { clinics: req.params.id } });
    res.json({ message: 'Clinic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting clinic' });
  }
};

// Upload / replace clinic logo
exports.uploadClinicLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No logo file uploaded' });

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    // Delete old logo if it exists
    if (clinic.logo) {
      const oldPath = path.join(__dirname, '..', clinic.logo.startsWith('/') ? clinic.logo.slice(1) : clinic.logo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoUrl = `/uploads/clinic-logos/${req.file.filename}`;
    const updated = await Clinic.findByIdAndUpdate(req.params.id, { logo: logoUrl }, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ message: 'Error uploading clinic logo' });
  }
};

// Remove clinic logo
exports.removeClinicLogo = async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    if (clinic.logo) {
      const logoPath = path.join(__dirname, '..', clinic.logo.startsWith('/') ? clinic.logo.slice(1) : clinic.logo);
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }

    const updated = await Clinic.findByIdAndUpdate(req.params.id, { logo: null }, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error removing clinic logo' });
  }
};
