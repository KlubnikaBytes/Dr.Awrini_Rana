require('dotenv').config();
require('mongoose').connect(process.env.MONGO_URI).then(async () => {
  const LabOrder = require('./models/LabOrder');
  
  // Find all lab orders missing clinicId
  const orders = await LabOrder.find({ clinicId: { $exists: false } });
  
  if (orders.length > 0) {
    console.log(`Found ${orders.length} LabOrders missing clinicId. Fixing...`);
    // Assuming the user is running the clinic, we'll just set it to a known clinicId.
    // Let's get the clinicId from a recent Bill
    const Bill = require('./models/Bill');
    const recentBill = await Bill.findOne().sort({ createdAt: -1 });
    
    if (recentBill && recentBill.clinicId) {
      await LabOrder.updateMany({ clinicId: { $exists: false } }, { $set: { clinicId: recentBill.clinicId } });
      console.log(`Fixed ${orders.length} LabOrders with clinicId ${recentBill.clinicId}`);
    } else {
      console.log('Could not find a recent Bill to infer clinicId');
    }
  } else {
    console.log('No LabOrders missing clinicId found.');
  }
  
  process.exit(0);
});
