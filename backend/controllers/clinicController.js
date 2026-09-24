const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const LabOrder = require('../models/LabOrder');
const DayCare = require('../models/DayCare');
const HomeCare = require('../models/HomeCare');
const Counter = require('../models/Counter');

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
    
    const clinics = user.clinics.map(c => {
      const obj = c.toObject();
      obj.hasPasscode = !!obj.passcode;
      delete obj.passcode;
      return obj;
    });
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clinics' });
  }
};

exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find();
    const mappedClinics = clinics.map(c => {
      const obj = c.toObject();
      obj.hasPasscode = !!obj.passcode;
      delete obj.passcode;
      return obj;
    });
    res.json(mappedClinics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clinics' });
  }
};

exports.createClinic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && user.clinics.length >= 3) {
      return res.status(400).json({ message: 'You can only add up to 3 clinics.' });
    }

    const { name, address, phone, email, patientIdPrefix, passcode } = req.body;
    const clinic = await Clinic.create({ name, address, phone, email, patientIdPrefix, passcode });
    
    // Add to current user's clinics
    await User.findByIdAndUpdate(req.user._id, { $push: { clinics: clinic._id } });

    res.status(201).json(clinic);
  } catch (error) {
    res.status(500).json({ message: 'Error creating clinic' });
  }
};

exports.updateClinic = async (req, res) => {
  try {
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ message: 'You can only edit the clinic you are currently logged into.' });
    }

    const oldClinic = await Clinic.findById(req.params.id);
    const oldPrefix = oldClinic.patientIdPrefix || 'ASR';
    const newPrefix = req.body.patientIdPrefix || 'ASR';

    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Auto re-number patients if prefix changed
    if (newPrefix.toUpperCase() !== oldPrefix.toUpperCase()) {
      // 1. Reset Counter for new prefix
      const prefixKey = `global_${newPrefix.toLowerCase()}`;
      await Counter.findOneAndUpdate({ _id: prefixKey }, { seq: 0 }, { upsert: true });

      // 2. Iterate all patients for this clinic
      const patients = await Patient.find({ clinicId: req.params.id }).sort({ createdAt: 1 });
      for (const p of patients) {
        const oldId = p.patientId;
        const newId = await Counter.nextId(newPrefix);
        
        // Update Patient
        p.patientId = newId;
        await p.save();
        
        // Update References
        await Appointment.updateMany({ patient: p._id }, { uhid: newId });
        await LabOrder.updateMany({ uhid: oldId, clinicId: req.params.id }, { uhid: newId });
        await DayCare.updateMany({ uhid: oldId, clinicId: req.params.id }, { uhid: newId });
        await HomeCare.updateMany({ uhid: oldId, clinicId: req.params.id }, { uhid: newId });
      }
    }

    res.json(clinic);
  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({ message: 'Error updating clinic' });
  }
};

exports.deleteClinic = async (req, res) => {
  try {
    const { passcode } = req.body;
    const requiredPasscode = process.env.DELETE_CLINIC_PASSCODE || 'ASR-DELETE';
    if (passcode !== requiredPasscode) {
      return res.status(401).json({ message: 'Invalid master passcode for deleting clinic' });
    }

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
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ message: 'You can only upload a logo for the clinic you are currently logged into.' });
    }

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
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ message: 'You can only remove the logo for the clinic you are currently logged into.' });
    }

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

exports.verifyClinicCode = async (req, res) => {
  try {
    const { passcode } = req.body;
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    if (!clinic.passcode) {
      return res.json({ success: true, message: 'No passcode required' });
    }

    if (clinic.passcode === passcode) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid clinic code' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying clinic code' });
  }
};
