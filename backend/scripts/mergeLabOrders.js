require('dotenv').config();
const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');
const Bill = require('../models/Bill');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Find all LabOrders
  const allOrders = await LabOrder.find({}).sort({ orderedDate: 1 });
  console.log(`Found ${allOrders.length} LabOrders total`);

  // Group by uhid + date string
  const grouped = {};
  for (const order of allOrders) {
    if (!order.uhid) continue;
    
    // Create a date string (YYYY-MM-DD)
    const dateStr = order.orderedDate.toISOString().split('T')[0];
    const key = `${order.uhid}_${dateStr}`;
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(order);
  }

  // Find groups with >1 order
  for (const key in grouped) {
    const orders = grouped[key];
    if (orders.length > 1) {
      console.log(`Merging ${orders.length} orders for ${key}`);
      
      // We keep the first one and merge others into it
      const primary = orders[0];
      
      for (let i = 1; i < orders.length; i++) {
        const other = orders[i];
        
        // Append tests
        primary.tests.push(...other.tests);
        primary.totalBilledAmount += other.totalBilledAmount;
        primary.finalAmount += other.finalAmount;
        primary.receivedAmount += other.receivedAmount;
        primary.balanceAmount += other.balanceAmount;
        
        // Combine payments
        if (other.payments && other.payments.length > 0) {
           primary.payments.push(...other.payments);
        }
        
        // Delete the duplicate
        await LabOrder.findByIdAndDelete(other._id);
      }
      
      // Re-evaluate billStatus
      primary.balanceAmount = Math.max(0, primary.finalAmount - primary.receivedAmount);
      primary.billStatus = primary.balanceAmount <= 0 ? 'Paid' : (primary.receivedAmount > 0 ? 'Partial' : 'Unbilled');
      
      await primary.save();
    }
  }

  console.log('Lab Orders merged. Now linking Front Desk Bills to Lab Orders...');

  // Now, link ALL Front Desk Bills that have Lab items to their respective LabOrder
  const allBills = await Bill.find({});
  for (const bill of allBills) {
    const hasLab = (bill.items || []).some(i => i.serviceType === 'Lab');
    if (hasLab) {
      // Find a LabOrder for this patient on this day
      const dateStr = bill.createdAt.toISOString().split('T')[0];
      const startOfDay = new Date(dateStr); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(dateStr); endOfDay.setHours(23,59,59,999);
      
      const patientIdStr = bill.patient ? bill.patient.toString() : null;
      let uhid = bill.patientName; // fallback
      
      const Patient = require('../models/Patient');
      if (patientIdStr) {
         const p = await Patient.findById(patientIdStr);
         if (p) uhid = p.patientId;
      }
      
      const labOrder = await LabOrder.findOne({
        uhid: uhid,
        orderedDate: { $gte: startOfDay, $lte: endOfDay }
      });
      
      if (labOrder) {
        bill.labOrder = labOrder._id;
        
        // Sync the payment proportion from bill to LabOrder!
        // We calculate proportion and update LabOrder
        if (bill.totalBalance <= 0) {
           labOrder.receivedAmount = labOrder.finalAmount;
           labOrder.balanceAmount = 0;
           labOrder.billStatus = 'Paid';
        } else if (bill.receivedAmount > 0) {
           const proportion = labOrder.finalAmount / bill.finalAmount;
           labOrder.receivedAmount = Math.max(labOrder.receivedAmount, parseFloat((bill.receivedAmount * proportion).toFixed(2)));
           labOrder.balanceAmount = Math.max(0, labOrder.finalAmount - labOrder.receivedAmount);
           labOrder.billStatus = labOrder.balanceAmount <= 0 ? 'Paid' : 'Partial';
        }
        await labOrder.save();
        await bill.save();
        console.log(`Linked Bill ${bill._id} to LabOrder ${labOrder._id} and synced payments`);
      }
    }
  }

  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
