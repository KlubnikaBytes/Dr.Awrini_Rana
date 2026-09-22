const User = require('../models/User');
const Staff = require('../models/Staff');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

exports.registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email,
      password,
      name,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Doctor: get current session info from DB (replaces localStorage doctorInfo) ──────
exports.doctorMe = async (req, res) => {
  try {
    // req.user is set by protect middleware when role === 'doctor_portal'
    if (!req.user || req.user.role !== 'doctor_portal') {
      return res.status(403).json({ message: 'Not a doctor session' });
    }
    const doctor = await Staff.findById(req.user._id).select('-password -doctorLoginPassword');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({
      staffId: doctor._id,
      doctorName: doctor.name,
      designation: doctor.designation || 'Dr.',
      speciality: doctor.speciality || '',
      clinicId: doctor.clinicId || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Doctor Portal Login (separate from main user login) ──────────────────────
exports.loginDoctor = async (req, res) => {
  const { doctorLoginId, password } = req.body;

  if (!doctorLoginId || !password) {
    return res.status(400).json({ message: 'Doctor ID and password are required' });
  }

  try {
    // Find the staff member who has this doctorLoginId
    const doctor = await Staff.findOne({ doctorLoginId: doctorLoginId.trim() });

    if (!doctor || !doctor.doctorLoginPassword) {
      return res.status(401).json({ message: 'Invalid Doctor ID or password' });
    }

    const isMatch = await bcrypt.compare(password, doctor.doctorLoginPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Doctor ID or password' });
    }

    // Build JWT — embeds only the minimum needed to identify the session server-side.
    // The client stores ONLY this token; all identity info comes from GET /auth/doctor-me.
    const token = jwt.sign(
      {
        doctorStaffId: doctor._id,
        clinicId: doctor.clinicId || null,
        role: 'doctor_portal',
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Return only the token — NO doctorInfo in the response body.
    // The frontend calls GET /api/auth/doctor-me to get live doctor details from DB.
    res.json({ doctorToken: token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
