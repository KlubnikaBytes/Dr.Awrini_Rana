const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ── Doctor Portal Token ──────────────────────────────────────────
      if (decoded.role === 'doctor_portal') {
        // For doctor portal sessions, attach a synthetic user-like object
        // so downstream controllers that need req.user have something
        const doctor = await Staff.findById(decoded.doctorStaffId).select('-password -doctorLoginPassword');
        if (!doctor) {
          return res.status(401).json({ message: 'Doctor session invalid' });
        }
        req.user = { _id: doctor._id, name: doctor.name, role: 'doctor_portal' };
        // Priority: JWT clinicId → doctor's DB clinicId → x-clinic-id header
        // The DB read ensures even old JWTs (before clinicId was embedded) still work
        req.clinicId = decoded.clinicId || doctor.clinicId || req.headers['x-clinic-id'];
        return next();
      }

      // ── Normal User Token ────────────────────────────────────────────
      // Find user and attach to request, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      // Attach clinic ID if provided in headers
      if (req.headers['x-clinic-id']) {
        req.clinicId = req.headers['x-clinic-id'];
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
