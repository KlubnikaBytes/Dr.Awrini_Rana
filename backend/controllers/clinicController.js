const Clinic = require('../models/Clinic');
const User = require('../models/User');

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
