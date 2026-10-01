require('dotenv').config();
const mongoose = require('mongoose');
const Consultation = require('./models/Consultation');
const ClinicDirectory = require('./models/ClinicDirectory');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthplix')
  .then(async () => {
    const counts = {
      total: await Consultation.countDocuments(),
      complaints: await Consultation.countDocuments({ 'complaints.0': { $exists: true } }),
      pastHistory: await Consultation.countDocuments({ pastHistory: { $ne: '' } }),
      personalHistory: await Consultation.countDocuments({ 'historyDetails.personalHistory.0': { $exists: true } }),
      familyHistory: await Consultation.countDocuments({ 'historyDetails.familyHistory.0': { $exists: true } }),
      pastMedications: await Consultation.countDocuments({ 'pastMedications.0': { $exists: true } }),
      dir_complaint: await ClinicDirectory.countDocuments({ type: 'COMPLAINT' }),
      dir_personal: await ClinicDirectory.countDocuments({ type: 'PERSONAL_HISTORY' }),
      dir_past_med: await ClinicDirectory.countDocuments({ type: 'PAST_MEDICATION' }),
    };
    console.log(JSON.stringify(counts, null, 2));
    process.exit(0);
  });
