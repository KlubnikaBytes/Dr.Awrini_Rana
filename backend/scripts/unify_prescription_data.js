require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function unifyPrescriptionData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthplix');
  console.log('Connected to MongoDB.');

  const Med = require('../models/MedicineDirectory');
  const ClinicDirectory = require('../models/ClinicDirectory');

  // 1. Process Medicines
  const allMeds = await Med.find({}).sort({ updatedAt: -1 }).lean();
  console.log(`Found ${allMeds.length} total medicine records.`);

  const medMap = new Map();
  for (const m of allMeds) {
    if (!m.medicineName || !m.medicineName.trim()) continue;
    const key = m.medicineName.trim().toLowerCase();
    if (!medMap.has(key)) {
      medMap.set(key, []);
    }
    medMap.get(key).push(m);
  }

  let medsKept = 0;
  let medsRemoved = 0;

  for (const [key, records] of medMap.entries()) {
    // Pick the best record (prefer non-deleted, prefer ones with dosage/genericName)
    const primary = records.find(r => !r.isDeleted && (r.genericName || r.dosage || r.frequency)) ||
                    records.find(r => !r.isDeleted) ||
                    records[0];

    // Merge non-empty fields from other records if primary lacks them
    const merged = {
      medicineName: primary.medicineName.trim().toUpperCase(),
      type: primary.type || records.find(r => r.type)?.type || 'TAB.',
      genericName: primary.genericName || records.find(r => r.genericName)?.genericName || '',
      dosage: primary.dosage || records.find(r => r.dosage)?.dosage || '',
      when: primary.when || records.find(r => r.when)?.when || '',
      frequency: primary.frequency || records.find(r => r.frequency)?.frequency || '',
      duration: primary.duration || records.find(r => r.duration)?.duration || '',
      notes: primary.notes || records.find(r => r.notes)?.notes || '',
      instructions: primary.instructions || records.find(r => r.instructions)?.instructions || '',
      isDeleted: false
    };

    // Update primary
    await Med.findByIdAndUpdate(primary._id, { $set: merged });
    medsKept++;

    // Remove duplicates
    const duplicateIds = records.filter(r => r._id.toString() !== primary._id.toString()).map(r => r._id);
    if (duplicateIds.length > 0) {
      await Med.deleteMany({ _id: { $in: duplicateIds } });
      medsRemoved += duplicateIds.length;
    }
  }

  console.log(`Medicines unified: ${medsKept} unique kept, ${medsRemoved} duplicates removed.`);

  // 2. Process ClinicDirectory
  const allDirs = await ClinicDirectory.find({}).sort({ updatedAt: -1 }).lean();
  console.log(`Found ${allDirs.length} total clinic directory records.`);

  const dirMap = new Map();
  for (const d of allDirs) {
    if (!d.type || !d.text || !d.text.trim()) continue;
    const key = `${d.type}:::${d.text.trim().toLowerCase()}`;
    if (!dirMap.has(key)) {
      dirMap.set(key, []);
    }
    dirMap.get(key).push(d);
  }

  let dirsKept = 0;
  let dirsRemoved = 0;

  for (const [key, records] of dirMap.entries()) {
    const primary = records.find(r => !r.isDeleted) || records[0];
    const cleanText = primary.text.trim().toUpperCase();

    await ClinicDirectory.findByIdAndUpdate(primary._id, {
      $set: {
        type: primary.type,
        text: cleanText,
        isDeleted: false
      }
    });
    dirsKept++;

    const duplicateIds = records.filter(r => r._id.toString() !== primary._id.toString()).map(r => r._id);
    if (duplicateIds.length > 0) {
      await ClinicDirectory.deleteMany({ _id: { $in: duplicateIds } });
      dirsRemoved += duplicateIds.length;
    }
  }

  console.log(`Clinic directory unified: ${dirsKept} unique kept, ${dirsRemoved} duplicates removed.`);

  // 3. Drop old index if exists on ClinicDirectory
  try {
    const indexes = await ClinicDirectory.collection.indexes();
    const oldIndex = indexes.find(i => i.name === 'clinicId_1_type_1_text_1');
    if (oldIndex) {
      await ClinicDirectory.collection.dropIndex('clinicId_1_type_1_text_1');
      console.log('Dropped old index: clinicId_1_type_1_text_1');
    }
  } catch (err) {
    console.log('Index drop note:', err.message);
  }

  const finalMedCount = await Med.countDocuments({ isDeleted: false });
  const finalDirCount = await ClinicDirectory.countDocuments({ isDeleted: false });
  console.log(`Final Active Medicines: ${finalMedCount}`);
  console.log(`Final Active Clinic Directory Items: ${finalDirCount}`);

  process.exit(0);
}

unifyPrescriptionData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
