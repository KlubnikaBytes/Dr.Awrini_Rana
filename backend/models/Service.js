const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['Appointment', 'Other'],
    required: true 
  },
  code: { type: String, default: '' }, // For Other Services usually blank or text
  serviceId: { type: String }, // Like 5029127764 (Mainly for Appointment Services)
  serviceName: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  gst: { type: Number, default: 0 },
  priority: { type: String }, // e.g., '1', '2'
  serviceOwner: { type: String, default: '-' },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
