/**
 * resetMedicines.js
 * ─────────────────────────────────────────────────────────────────
 * ONE-TIME script — deletes all medicine data:
 *   • Suggestion (type MEDICINE & GENERIC_NAME) — clears the autocomplete
 *   • MedicineMeta — clears company/MR name mappings
 *
 * Run from the backend folder:
 *   node scripts/resetMedicines.js
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Suggestion   = require('../models/Suggestion');
const MedicineMeta = require('../models/MedicineMeta');

async function run() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI not found in .env — aborting.');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  // Delete medicine & generic name suggestions only
  const medSugg = await Suggestion.deleteMany({
    type: { $in: ['MEDICINE', 'GENERIC_NAME'] }
  });

  // Delete all medicine meta (company, MR name mappings)
  const medMeta = await MedicineMeta.deleteMany({});

  console.log('🗑️  Deletion results:');
  console.log(`   Medicine suggestions : ${medSugg.deletedCount}`);
  console.log(`   MedicineMeta records : ${medMeta.deletedCount}`);
  console.log('\n✅  Done. Doctor can now add medicines fresh from the VisitPad.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
