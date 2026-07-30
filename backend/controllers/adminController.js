const Staff = require('../models/Staff');
const ReferralDoctor = require('../models/ReferralDoctor');
const Vendor = require('../models/Vendor');

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
