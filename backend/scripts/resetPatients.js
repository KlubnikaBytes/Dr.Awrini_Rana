/**
 * resetPatients.js
 * ─────────────────────────────────────────────────────────────────
 * ONE-TIME script — deletes all Patients, Appointments, LabOrders,
 * Bills, DayCare, HomeCare records and resets the ASR counter to 0
 * so the next patient registered gets ASR000001.
 *
 * Run from the backend folder:
 *   node scripts/resetPatients.js
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Patient     = require('../models/Patient');
const Appointment = require('../models/Appointment');
const LabOrder    = require('../models/LabOrder');
const Bill        = require('../models/Bill');
const DayCare     = require('../models/DayCare');
const HomeCare    = require('../models/HomeCare');
const Counter     = require('../models/Counter');

async function run() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI not found in .env — aborting.');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  const results = {};

  results.patients     = (await Patient.deleteMany({})).deletedCount;
  results.appointments = (await Appointment.deleteMany({})).deletedCount;
  results.labOrders    = (await LabOrder.deleteMany({})).deletedCount;
  results.bills        = (await Bill.deleteMany({})).deletedCount;
  results.dayCare      = (await DayCare.deleteMany({})).deletedCount;
  results.homeCare     = (await HomeCare.deleteMany({})).deletedCount;

  // Reset counter so next patient = ASR000001
  await Counter.findOneAndUpdate(
    { _id: 'global_asr' },
    { $set: { seq: 0 } },
    { upsert: true }
  );
  results.counter = 'Reset to 0 → next ID = ASR000001';

  console.log('🗑️  Deletion results:');
  Object.entries(results).forEach(([k, v]) => {
    console.log(`   ${k.padEnd(14)}: ${v}`);
  });

  console.log('\n✅  Done. First new patient will be ASR000001.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
