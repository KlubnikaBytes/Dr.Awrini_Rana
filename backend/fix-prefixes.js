const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Clinic = require('./models/Clinic');
  const Patient = require('./models/Patient');
  const Counter = require('./models/Counter');
  const Appointment = require('./models/Appointment');
  const LabOrder = require('./models/LabOrder');
  const DayCare = require('./models/DayCare');
  const HomeCare = require('./models/HomeCare');

  const clinics = await Clinic.find();
  for (const clinic of clinics) {
    const prefix = clinic.patientIdPrefix || 'ASR';
    const patients = await Patient.find({ clinicId: clinic._id });
    for (let p of patients) {
      if (!p.patientId.startsWith(prefix)) {
        const oldId = p.patientId;
        const numberPart = oldId.replace(/^[A-Z]+/, '');
        const newId = prefix + numberPart;
        p.patientId = newId;
        await p.save();

        await Appointment.updateMany({ patient: p._id }, { uhid: newId });
        await LabOrder.updateMany({ uhid: oldId, clinicId: clinic._id }, { uhid: newId });
        await DayCare.updateMany({ uhid: oldId, clinicId: clinic._id }, { uhid: newId });
        await HomeCare.updateMany({ uhid: oldId, clinicId: clinic._id }, { uhid: newId });

        console.log(`Updated ${p.name} from ${oldId} to ${newId}`);
      }
    }
  }
  console.log('Done fixing prefixes.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
