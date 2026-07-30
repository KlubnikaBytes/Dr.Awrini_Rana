const mongoose = require('mongoose');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const Bill = require('./models/Bill');
const TestResult = require('./models/TestResult');
const Attachment = require('./models/Attachment');
require('dotenv').config();

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const user = await User.findOne({ email: 'agnik.m03@gmail.com' });
    if (!user) {
      console.log('User agnik.m03@gmail.com not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user._id})`);

    const updateCondition = { userId: { $exists: false } }; // or just update all if needed, but let's update all that don't have it

    const patientRes = await Patient.updateMany({}, { $set: { userId: user._id } });
    console.log(`Updated Patients: ${patientRes.modifiedCount}`);

    const apptRes = await Appointment.updateMany({}, { $set: { userId: user._id } });
    console.log(`Updated Appointments: ${apptRes.modifiedCount}`);

    const billRes = await Bill.updateMany({}, { $set: { userId: user._id } });
    console.log(`Updated Bills: ${billRes.modifiedCount}`);

    const testRes = await TestResult.updateMany({}, { $set: { userId: user._id } });
    console.log(`Updated TestResults: ${testRes.modifiedCount}`);

    const attRes = await Attachment.updateMany({}, { $set: { userId: user._id } });
    console.log(`Updated Attachments: ${attRes.modifiedCount}`);

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
