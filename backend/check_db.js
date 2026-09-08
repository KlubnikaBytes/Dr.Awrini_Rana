const mongoose = require('mongoose');
const Consultation = require('./models/Consultation');
require('dotenv').config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthplix');
    const consultations = await Consultation.find({ 'medicines.medicineName': /BULARID/i }).sort({ createdAt: -1 }).lean();
    console.log(`Found ${consultations.length} consultations`);
    for (const c of consultations) {
        console.log(`Consultation ${c._id}:`);
        for (const m of c.medicines) {
            if (m.medicineName && m.medicineName.toLowerCase().includes('bularid')) {
                console.log(`  Medicine: ${m.medicineName}, generic: ${m.genericName}, dosage: ${m.dosage}, when: ${m.when}, frequency: ${m.frequency}, duration: ${m.duration}, notes: ${m.notes}`);
            }
        }
    }
    process.exit(0);
}
run();
