const Staff = require('../models/Staff');
const ReferralDoctor = require('../models/ReferralDoctor');
const Vendor = require('../models/Vendor');
const LabCatalog = require('../models/LabCatalog');
const TieUpOrg = require('../models/TieUpOrg');

// ======================= STAFF =======================
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ clinicId: req.clinicId }).select('-password -doctorLoginPassword');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching staff' });
  }
};

exports.addStaff = async (req, res) => {
  try {
    const { name, designation, gender, role, email, phone, password, signatureText, speciality, department, signatureImage, qualifications, registrationNo, contactForPrescription, bio, fees } = req.body;
    
    const staff = await Staff.create({
      clinicId: req.clinicId,
      name, designation: designation || 'Dr.', gender, role, email, phone, password, signatureText, speciality, department, signatureImage, qualifications, registrationNo, contactForPrescription, bio, fees
    });

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
      designation: staff.designation,
      email: staff.email,
      role: staff.role,
      staffId: staff.staffId
    });
  } catch (error) {
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { name, designation, gender, role, phone, signatureText, department, speciality, signatureImage, qualifications, registrationNo, contactForPrescription, bio, fees } = req.body;
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { name, designation: designation || 'Dr.', gender, role, phone, signatureText, department, speciality, signatureImage, qualifications, registrationNo, contactForPrescription, bio, fees },
      { new: true, runValidators: true }
    ).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    await Staff.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Set / update doctor portal login credentials (admin only) ────────────────
exports.setDoctorCredentials = async (req, res) => {
  try {
    const { doctorLoginId, doctorLoginPassword } = req.body;

    if (!doctorLoginId || !doctorLoginPassword) {
      return res.status(400).json({ message: 'Doctor Login ID and password are required' });
    }
    if (doctorLoginPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    // Check uniqueness — another staff member may already have this ID
    const existing = await Staff.findOne({ doctorLoginId: doctorLoginId.trim(), _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ message: `Doctor ID "${doctorLoginId}" is already taken by another doctor` });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Doctor not found' });

    staff.doctorLoginId = doctorLoginId.trim();
    staff.doctorLoginPassword = doctorLoginPassword; // pre-save hook will bcrypt this
    // Stamp the admin's current clinicId so the doctor's JWT always has the right clinic
    if (req.clinicId) staff.clinicId = req.clinicId;
    await staff.save();

    res.json({ message: 'Doctor portal credentials updated successfully', doctorLoginId: staff.doctorLoginId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ── Designations: return unique designations from Doctor-role staff ──────────
exports.getDesignations = async (req, res) => {
  try {
    const BASE_DESIGNATIONS = ['Dr.', 'Pt.', 'Dt.'];
    const staff = await Staff.find({ role: 'Doctor', clinicId: req.clinicId }).select('designation').lean();
    const fromDb = [...new Set(staff.map(s => s.designation).filter(Boolean))];
    // Merge base list + any custom ones from DB, preserving order
    const merged = [...new Set([...BASE_DESIGNATIONS, ...fromDb])];
    res.json(merged);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================= REFERRAL DOCTORS =======================
exports.getReferralDoctors = async (req, res) => {
  try {
    const docs = await ReferralDoctor.find({ clinicId: req.clinicId });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching referral doctors' });
  }
};

exports.addReferralDoctor = async (req, res) => {
  try {
    const { name, specialization, type } = req.body;
    const doc = await ReferralDoctor.create({ clinicId: req.clinicId, name, specialization, type: type || 'BY' });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating referral doctor' });
  }
};

exports.updateReferralDoctor = async (req, res) => {
  try {
    const { name, specialization, type } = req.body;
    const doc = await ReferralDoctor.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { name, specialization, type },
      { new: true }
    );
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating referral doctor' });
  }
};

exports.deleteReferralDoctor = async (req, res) => {
  try {
    await ReferralDoctor.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Referral doctor deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting referral doctor' });
  }
};

// ======================= VENDORS =======================
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ clinicId: req.clinicId });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching vendors' });
  }
};

exports.addVendor = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const vendor = await Vendor.create({ clinicId: req.clinicId, name, phone });
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating vendor' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    await Vendor.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting vendor' });
  }
};

// ======================= LAB CATALOG =======================
exports.getLabCatalog = async (req, res) => {
  try {
    const catalog = await LabCatalog.find({ clinicId: req.clinicId }).sort({ category: 1 });
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching lab catalog' });
  }
};

exports.addLabCategory = async (req, res) => {
  try {
    const { category, tests } = req.body;
    const existing = await LabCatalog.findOne({ clinicId: req.clinicId, category });
    if (existing) return res.status(400).json({ message: 'Category already exists' });
    
    const newCategory = await LabCatalog.create({ clinicId: req.clinicId, category, tests: tests || [] });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding lab category' });
  }
};

exports.updateLabCategory = async (req, res) => {
  try {
    const { tests } = req.body;
    const updated = await LabCatalog.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { tests },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating lab category' });
  }
};

exports.deleteLabCategory = async (req, res) => {
  try {
    await LabCatalog.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting lab category' });
  }
};

// ======================= TIE-UP ORGS =======================
exports.getTieUpOrgs = async (req, res) => {
  try {
    const orgs = await TieUpOrg.find({ clinicId: req.clinicId }).sort({ name: 1 });
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching tie-up orgs' });
  }
};

exports.addTieUpOrg = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await TieUpOrg.findOne({ clinicId: req.clinicId, name });
    if (existing) return res.status(400).json({ message: 'Organization already exists' });
    
    const newOrg = await TieUpOrg.create({ clinicId: req.clinicId, name });
    res.status(201).json(newOrg);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding tie-up org' });
  }
};

exports.updateTieUpOrg = async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await TieUpOrg.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { name },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating tie-up org' });
  }
};

exports.deleteTieUpOrg = async (req, res) => {
  try {
    await TieUpOrg.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting tie-up org' });
  }
};
