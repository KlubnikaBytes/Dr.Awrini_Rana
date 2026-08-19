require('dotenv').config();
const mongoose = require('mongoose');
const Clinic = require('./models/Clinic');
const LabCatalog = require('./models/LabCatalog');

const TEST_CATEGORIES = {
  "HAEMATOLOGY": [
    "Absolute Eosinophil Count (cells/cumm)","Haemoglobin (Hb) (Gms %)","Total WBC Count (Cells/cu mm)",
    "Haematocrit (PCV) (%)","Neutrophils (%)","Lymphocytes (%)","Eosinophils (%)","Monocytes (%)",
    "Basophils (%)","RBC (million cells/cu mm)","ESR (mm/hour)","MCV (fL)","MCH (pg)","Platelets (-)"
  ],
  "BIO CHEMISTRY": [
    "Fasting Blood Sugar (FBS) (mg/dL)","Post Prandial Blood Sugar (PPBS) (mg/dL)",
    "Glycosylated Haemoglobin - HbA1c (%)","Random Blood Sugar - RBS (mg/dL)","Ketone (-)","Protein (-)"
  ],
  "LIPID PROFILE": [
    "Total Cholesterol (mg/dL)","Serum HDL Cholesterol (mg/dL)","Serum Triglycerides (mg/dL)",
    "Serum LDL Cholesterol (mg/dL)","Serum VLDL Cholesterol (mg/dL)","Non HDL Cholesterol (mg/dL)"
  ],
  "KIDNEY FUNCTION TEST": [
    "Blood Urea (mg/dL)","Serum Creatinine (mg/dL)","Serum Sodium (Na+) (mEq/L)",
    "Serum Potassium (K+) (mEq/L)","Serum Uric Acid (mg/dL)","eGFR (mL/min/1.73m2)"
  ],
  "LIVER FUNCTION TEST": [
    "Serum Bilirubin Total (mg/dL)","Serum Bilirubin Direct (mg/dL)",
    "Serum Protein - Total (g/dL)","Serum Protein - Albumin (g/dL)",
    "SGOT (AST) (IU/L)","SGPT (ALT) (IU/L)","Serum Alkaline Phosphatase (IU/L)","GGT (IU/L)"
  ],
  "UACR": ["Urine Albumin (mg/L)","Urine Creatinine (mg/dL)","Spot Albumin Creatinine Ratio (mg/g)"],
  "URINE ROUTINE": [
    "Colour (-)","Appearance (-)","Albumin (-)","Sugar (-)","Pus Cells (-)","RBCs (-)",
    "Casts (-)","Crystals (-)","Specific Gravity (-)","Urine PH (-)"
  ],
  "THYROID FUNCTION TEST": [
    "TSH (mIU/L)","T3 (ng/dL)","T4 (μg/dL)","Free T3 (ng/mL)","Free T4 (ng/dL)"
  ],
  "PCOS / Infertility": [
    "LH (mIU/mL)","FSH (mIU/mL)","Prolactin (ng/mL)","Testosterone Total (ng/dL)","DHEAS (-)"
  ],
  "OTHERS": ["ECG (-)","ULTRASOUND (-)","FNAC (-)","X-Ray (-)","MRI (-)"]
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const clinics = await Clinic.find();
  for (const clinic of clinics) {
    for (const [category, tests] of Object.entries(TEST_CATEGORIES)) {
      await LabCatalog.findOneAndUpdate(
        { clinicId: clinic._id, category },
        { tests },
        { upsert: true }
      );
    }
  }

  console.log('Seeding completed successfully');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
