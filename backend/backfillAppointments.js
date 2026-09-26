const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const HomeCare = require('./models/HomeCare');
const DayCare = require('./models/DayCare');
const LabOrder = require('./models/LabOrder');

const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/healthplis';

async function backfill() {
  await mongoose.connect(dbURI);
  console.log('Connected to DB');

  const homeCares = await HomeCare.find({});
  for (const hc of homeCares) {
    if (hc.startDate && hc.uhid) {
      const patientDoc = await Patient.findOne({ patientId: hc.uhid });
      if (patientDoc) {
        const dStart = new Date(hc.startDate); dStart.setHours(0,0,0,0);
        const dEnd = new Date(hc.startDate); dEnd.setHours(23,59,59,999);
        const exists = await Appointment.findOne({
          uhid: hc.uhid,
          serviceType: 'Home Care',
          date: { $gte: dStart, $lte: dEnd }
        });
        if (!exists) {
          const appointmentDate = new Date(hc.startDate);
          appointmentDate.setHours(0,0,0,0);
          const maxAppt = await Appointment.findOne({ date: appointmentDate }).sort('-queueNumber');
          const finalQueueNumber = maxAppt && maxAppt.queueNumber ? maxAppt.queueNumber + 1 : 1;
          await Appointment.create({
            userId: hc.userId,
            clinicId: hc.clinicId,
            patient: patientDoc._id,
            uhid: patientDoc.patientId,
            doctorName: hc.performerName || 'Unassigned',
            service: hc.serviceType || 'Home Care',
            serviceType: 'Home Care',
            status: 'BOOKED',
            date: appointmentDate,
            queueNumber: finalQueueNumber,
          });
          console.log(`Created missing Frontdesk appointment for Home Care ${hc._id}`);
        }
      }
    }
  }

  const dayCares = await DayCare.find({});
  for (const dc of dayCares) {
    if (dc.admissionDate && dc.uhid) {
      const patientDoc = await Patient.findOne({ patientId: dc.uhid });
      if (patientDoc) {
        const dStart = new Date(dc.admissionDate); dStart.setHours(0,0,0,0);
        const dEnd = new Date(dc.admissionDate); dEnd.setHours(23,59,59,999);
        const exists = await Appointment.findOne({
          uhid: dc.uhid,
          serviceType: 'Day Care',
          date: { $gte: dStart, $lte: dEnd }
        });
        if (!exists) {
          const appointmentDate = new Date(dc.admissionDate);
          appointmentDate.setHours(0,0,0,0);
          const maxAppt = await Appointment.findOne({ date: appointmentDate }).sort('-queueNumber');
          const finalQueueNumber = maxAppt && maxAppt.queueNumber ? maxAppt.queueNumber + 1 : 1;
          await Appointment.create({
            userId: dc.userId,
            clinicId: dc.clinicId,
            patient: patientDoc._id,
            uhid: patientDoc.patientId,
            doctorName: dc.doctorName || 'Unassigned',
            service: 'Day Care',
            serviceType: 'Day Care',
            status: 'BOOKED',
            date: appointmentDate,
            queueNumber: finalQueueNumber,
          });
          console.log(`Created missing Frontdesk appointment for Day Care ${dc._id}`);
        }
      }
    }
  }

  const labOrders = await LabOrder.find({});
  for (const lo of labOrders) {
    if (lo.orderedDate && lo.uhid) {
      const patientDoc = await Patient.findOne({ patientId: lo.uhid });
      if (patientDoc) {
        const dStart = new Date(lo.orderedDate); dStart.setHours(0,0,0,0);
        const dEnd = new Date(lo.orderedDate); dEnd.setHours(23,59,59,999);
        const exists = await Appointment.findOne({
          uhid: lo.uhid,
          serviceType: 'Lab',
          date: { $gte: dStart, $lte: dEnd }
        });
        if (!exists) {
          const appointmentDate = new Date(lo.orderedDate);
          appointmentDate.setHours(0,0,0,0);
          const maxAppt = await Appointment.findOne({ date: appointmentDate }).sort('-queueNumber');
          const finalQueueNumber = maxAppt && maxAppt.queueNumber ? maxAppt.queueNumber + 1 : 1;
          await Appointment.create({
            userId: lo.userId,
            clinicId: lo.clinicId,
            patient: patientDoc._id,
            uhid: patientDoc.patientId,
            doctorName: lo.referredBy || 'Unassigned',
            service: 'Lab',
            serviceType: 'Lab',
            status: 'BOOKED',
            date: appointmentDate,
            queueNumber: finalQueueNumber,
          });
          console.log(`Created missing Frontdesk appointment for Lab Order ${lo._id}`);
        }
      }
    }
  }

  console.log('Backfill complete.');
  mongoose.disconnect();
}

backfill().catch(console.error);
