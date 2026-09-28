require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const MedicineDirectory = require('../models/MedicineDirectory');
const ClinicDirectory = require('../models/ClinicDirectory');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const consultations = await Consultation.find({}).lean();
    console.log(`Found ${consultations.length} consultations to process.`);

    const medOpsMap = new Map();
    const clinicDirOpsMap = new Map();

    for (const c of consultations) {
      if (!c.clinicId) continue;
      const clinicIdStr = c.clinicId.toString();

      // 1. Process Medicines
      if (c.medicines && Array.isArray(c.medicines)) {
        for (const m of c.medicines) {
          if (!m.medicineName || !m.medicineName.trim()) continue;
          const medName = m.medicineName.trim().toUpperCase();
          const key = `${clinicIdStr}_${medName}`;

          if (!medOpsMap.has(key)) {
            medOpsMap.set(key, {
              updateOne: {
                filter: { clinicId: c.clinicId, medicineName: medName },
                update: {
                  $setOnInsert: {
                    clinicId: c.clinicId,
                    medicineName: medName,
                    type: m.type || '',
                    genericName: m.genericName || '',
                    dosage: m.dosage || '',
                    when: m.when || '',
                    frequency: m.frequency || '',
                    duration: m.duration || '',
                    notes: m.notes || '',
                    instructions: m.instructions || '',
                    isDeleted: false
                  }
                },
                upsert: true
              }
            });
          }
        }
      }

      // 2. Process Clinic Directory fields
      const addTexts = (val, type) => {
        if (!val) return;
        const addSingle = (str) => {
          if (str && str.trim()) {
            const text = str.trim().toUpperCase();
            const key = `${clinicIdStr}_${type}_${text}`;
            if (!clinicDirOpsMap.has(key)) {
              clinicDirOpsMap.set(key, {
                updateOne: {
                  filter: { clinicId: c.clinicId, type, text },
                  update: { $setOnInsert: { clinicId: c.clinicId, type, text, isDeleted: false } },
                  upsert: true
                }
              });
            }
          }
        };

        if (Array.isArray(val)) {
          val.forEach(item => {
            if (typeof item === 'string') addSingle(item);
            else if (typeof item === 'object' && item.testName) addSingle(item.testName);
          });
        } else if (typeof val === 'string') {
          val.split('\n').forEach(addSingle);
        }
      };

      addTexts(c.complaints, 'COMPLAINT');
      addTexts(c.diagnosis, 'DIAGNOSIS');
      addTexts(c.testsRequested, 'TEST');
      addTexts(c.pastHistory, 'PAST_HISTORY');
      addTexts(c.physicalExamination, 'PHYSICAL_EXAM');
      addTexts(c.advice, 'ADVICE');
      if (c.historyDetails) {
        addTexts(c.historyDetails.personalHistory, 'PERSONAL_HISTORY');
      }
      addTexts(c.pastMedications, 'PAST_MEDICATION');
    }

    const medOps = Array.from(medOpsMap.values());
    const clinicOps = Array.from(clinicDirOpsMap.values());

    console.log(`Prepared ${medOps.length} unique medicine upserts.`);
    console.log(`Prepared ${clinicOps.length} unique clinic directory upserts.`);

    if (medOps.length > 0) {
      console.log('Writing medicines...');
      await MedicineDirectory.bulkWrite(medOps, { ordered: false });
    }
    
    if (clinicOps.length > 0) {
      console.log('Writing clinic directories...');
      await ClinicDirectory.bulkWrite(clinicOps, { ordered: false });
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
