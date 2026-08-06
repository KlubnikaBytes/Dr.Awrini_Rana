require('dotenv').config();
const mongoose = require('mongoose');

const Clinic = require('./models/Clinic');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const Bill = require('./models/Bill');
const Consultation = require('./models/Consultation');
const DayCare = require('./models/DayCare');
const HomeCare = require('./models/HomeCare');
const LabOrder = require('./models/LabOrder');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const migrate = async () => {
  await connectDB();

  // Create a default clinic if none exist
  let defaultClinic = await Clinic.findOne({ name: 'ASR DOCTOR CLINIC' });
  if (!defaultClinic) {
    defaultClinic = await Clinic.create({
      name: 'ASR DOCTOR CLINIC',
      address: 'Street No-256, CB Block, Action Area I, Newtown, Kolkata-700156, India',
    });
    console.log('Created Default Clinic: ASR DOCTOR CLINIC');
  } else {
    console.log('Default Clinic already exists');
  }

  // Create additional clinics from screenshot
  const clinicsToCreate = [
    { name: 'Safi Medical', address: 'Unknown' },
    { name: 'Dr Rana Caregenix', address: 'North 24 Parganas' },
    { name: 'LIFETRON MEDICARE PVT LTD', address: 'Block B 102, 103 Downtown Mall, 1st Floor, Uniworld City, Newtown, Kolkata, West Bengal 700160, India' }
  ];

  for (let c of clinicsToCreate) {
    let exists = await Clinic.findOne({ name: c.name });
    if (!exists) {
      await Clinic.create(c);
      console.log(`Created Clinic: ${c.name}`);
    }
  }

  const allClinics = await Clinic.find({});
  const clinicIds = allClinics.map(c => c._id);

  // Assign clinics to users
  await User.updateMany(
    { clinics: { $exists: false } },
    { $set: { clinics: clinicIds } }
  );
  await User.updateMany(
    { clinics: { $size: 0 } },
    { $set: { clinics: clinicIds } }
  );

  const filter = { clinicId: { $exists: false } };
  const update = { $set: { clinicId: defaultClinic._id } };

  const resPatient = await Patient.updateMany(filter, update);
  console.log(`Updated Patients: ${resPatient.modifiedCount}`);

  const resAppt = await Appointment.updateMany(filter, update);
  console.log(`Updated Appointments: ${resAppt.modifiedCount}`);

  const resBill = await Bill.updateMany(filter, update);
  console.log(`Updated Bills: ${resBill.modifiedCount}`);

  const resCons = await Consultation.updateMany(filter, update);
  console.log(`Updated Consultations: ${resCons.modifiedCount}`);

  const resDay = await DayCare.updateMany(filter, update);
  console.log(`Updated DayCare: ${resDay.modifiedCount}`);

  const resHome = await HomeCare.updateMany(filter, update);
  console.log(`Updated HomeCare: ${resHome.modifiedCount}`);

  const resLab = await LabOrder.updateMany(filter, update);
  console.log(`Updated LabOrder: ${resLab.modifiedCount}`);

  console.log('Migration Complete');
  process.exit();
};

migrate();
