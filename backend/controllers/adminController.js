const Staff = require('../models/Staff');
const ReferralDoctor = require('../models/ReferralDoctor');
const Vendor = require('../models/Vendor');
const LabCatalog = require('../models/LabCatalog');
const TieUpOrg = require('../models/TieUpOrg');

// ======================= STAFF =======================
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find().select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching staff' });
  }
};

exports.addStaff = async (req, res) => {
  try {
    const { name, gender, role, email, phone, password, signatureText, speciality, department, signatureImage } = req.body;
    
    const staffExists = await Staff.findOne({ email });
    if (staffExists) return res.status(400).json({ message: 'Staff with this email already exists' });

    const staff = await Staff.create({
      name, gender, role, email, phone, password, signatureText, speciality, department, signatureImage
    });

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
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
    const { name, gender, role, phone, signatureText, department, signatureImage } = req.body;
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { name, gender, role, phone, signatureText, department, signatureImage },
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
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================= REFERRAL DOCTORS =======================
exports.getReferralDoctors = async (req, res) => {
  try {
    const docs = await ReferralDoctor.find();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching referral doctors' });
  }
};

exports.addReferralDoctor = async (req, res) => {
  try {
    const { name, specialization } = req.body;
    const doc = await ReferralDoctor.create({ name, specialization });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating referral doctor' });
  }
};

exports.deleteReferralDoctor = async (req, res) => {
  try {
    await ReferralDoctor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Referral doctor deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting referral doctor' });
  }
};

// ======================= VENDORS =======================
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching vendors' });
  }
};

exports.addVendor = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const vendor = await Vendor.create({ name, phone });
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating vendor' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
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
