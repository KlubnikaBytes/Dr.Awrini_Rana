const mongoose = require('mongoose');
const Consultation = require('./models/Consultation');
require('dotenv').config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthplix');
    
    // Check all consultations to see what they have
    const name = "BULARID M";
    const consultations = await Consultation.find({ 
      'medicines.medicineName': { $regex: new RegExp(`^${name}$`, 'i') } 
    }).sort({ updatedAt: -1 }).limit(20).lean();
    
    console.log(`Found ${consultations.length} consultations sorted by updatedAt:`);
    
    let bestMatch = null;
    let maxFields = -1;

    for (const consultation of consultations) {
      const medicines = consultation.medicines.filter(m => 
        m.medicineName && m.medicineName.toLowerCase() === name.toLowerCase()
      );
      
      for (const m of medicines) {
        let fieldCount = 0;
        if (m.dosage) fieldCount++;
        if (m.when) fieldCount++;
        if (m.frequency) fieldCount++;
        if (m.duration) fieldCount++;
        if (m.notes) fieldCount++;
        
        console.log(`Consultation ${consultation._id}, updatedAt: ${consultation.updatedAt}, fieldCount: ${fieldCount}`);
        
        if (fieldCount >= 4) {
          console.log("Would return early:", m);
          process.exit(0);
        }
        
        if (fieldCount > maxFields) {
          maxFields = fieldCount;
          bestMatch = m;
        }
      }
    }
    
    console.log('Would return bestMatch:', bestMatch);
    process.exit(0);
}
run();
