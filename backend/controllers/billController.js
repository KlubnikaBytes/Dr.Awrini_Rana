const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const LabOrder = require('../models/LabOrder');
const DayCare = require('../models/DayCare');
const HomeCare = require('../models/HomeCare');
const { broadcast } = require('../websocket');

// Helper to normalize LabOrder into a bill-like format for the frontend
const formatLabOrderAsBill = (order) => ({
  _id: order._id,
  isLabOrder: true,
  sourceType: 'Lab',
  patientName: order.patientName,
  billDate: order.billDate || order.createdAt,
  createdAt: order.createdAt,
  items: order.tests.map(t => ({
    serviceName: t.name,
    qty: t.qty,
    unitPrice: t.unitPrice,
    gstPercent: t.tax,
    discount: t.discount,
    totalPrice: t.totalPrice
  })),
  payments: order.payments,
  totalBilledAmount: order.totalBilledAmount,
  totalDiscount: order.totalDiscount,
  totalTax: order.totalTax,
  finalAmount: order.finalAmount,
  receivedAmount: order.receivedAmount,
  totalBalance: order.balanceAmount,
  billNo: order.uhid ? `LAB-${order.uhid}` : 'LAB'
});

// GET /api/bills/patient/:patientId?startDate=xxx&endDate=xxx
exports.getPatientBills = async (req, res) => {
  try {
    const { patientId } = req.params; // this is the 'uhid' or 'patientId'
    const { startDate, endDate } = req.query;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    // 1. Try to find the patient in the Patient collection
    const patient = await Patient.findOne({ patientId, clinicId: req.clinicId });

    // 2. Build date query if provided
    let dateQuery = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery = { createdAt: { $gte: start, $lte: end } };
    }

    // 3. Find Bills (Appointments, DayCare, HomeCare)
    // A bill is linked if bill.patient == patient._id OR 
    // its dayCare/homeCare document has uhid == patientId
    let billQuery = { clinicId: req.clinicId, ...dateQuery };
    
    // We will fetch all bills for this clinic, then filter by patientId in memory 
    // because DayCare/HomeCare might not have 'patient' ObjectId set properly.
    // Alternatively, we can find DayCare/HomeCare records with this uhid first.
    
    const dayCares = await DayCare.find({ uhid: patientId, clinicId: req.clinicId }, '_id');
    const homeCares = await HomeCare.find({ uhid: patientId, clinicId: req.clinicId }, '_id');
    
    const dayCareIds = dayCares.map(d => d._id);
    const homeCareIds = homeCares.map(h => h._id);
    
    const patientCondition = [];
    if (patient) patientCondition.push({ patient: patient._id });
    if (dayCareIds.length > 0) patientCondition.push({ dayCare: { $in: dayCareIds } });
    if (homeCareIds.length > 0) patientCondition.push({ homeCare: { $in: homeCareIds } });
    
    // If no matching patient or care records, we still query but with a condition that fails,
    // unless the patientId matches exactly some arbitrary criteria.
    if (patientCondition.length > 0) {
      billQuery.$or = patientCondition;
    } else {
      // If patient not found and no day/home care records, query returns empty unless we fallback
      billQuery.patientName = patientId; // Highly unlikely, but prevents empty $or error
    }

    let bills = [];
    if (patientCondition.length > 0) {
       bills = await Bill.find(billQuery).sort({ createdAt: -1 });
    }

    // 4. Find LabOrders with this uhid
    let labQuery = { clinicId: req.clinicId, uhid: patientId, ...dateQuery, finalAmount: { $gt: 0 } };
    const labOrders = await LabOrder.find(labQuery).sort({ createdAt: -1 });

    // 5. Combine and sort
    const formattedLabOrders = labOrders.map(formatLabOrderAsBill);
    const combined = [...bills, ...formattedLabOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};

// POST /api/bills/merge-pay
exports.mergeAndPayBills = async (req, res) => {
  try {
    const { billIds, globalDiscount, paymentAmount, paymentMode } = req.body;

    if (!billIds || billIds.length === 0) {
      return res.status(400).json({ message: 'No bills selected to merge' });
    }

    // Separate normal Bills from LabOrders
    // billIds from frontend will be a mix of Bill._id and LabOrder._id
    const normalBills = await Bill.find({ _id: { $in: billIds }, clinicId: req.clinicId });
    const labOrders = await LabOrder.find({ _id: { $in: billIds }, clinicId: req.clinicId });

    if (normalBills.length === 0 && labOrders.length === 0) {
      return res.status(404).json({ message: 'No valid bills found' });
    }

    let totalOwed = 0;
    normalBills.forEach(b => totalOwed += b.totalBalance);
    labOrders.forEach(b => totalOwed += b.balanceAmount);

    if (totalOwed <= 0) {
      return res.status(400).json({ message: 'Selected bills are already fully paid.' });
    }

    let remainingDiscount = globalDiscount || 0;
    let remainingPayment = paymentAmount || 0;
    const allBills = [...normalBills, ...labOrders];

    for (let i = 0; i < allBills.length; i++) {
      const bill = allBills[i];
      const isLab = !!bill.tests; // LabOrder has 'tests' instead of 'items'
      
      let balance = isLab ? bill.balanceAmount : bill.totalBalance;
      if (balance <= 0) continue;

      let discountForThisBill = 0;
      if (remainingDiscount > 0) {
        if (i === allBills.length - 1) {
          discountForThisBill = remainingDiscount;
        } else {
          discountForThisBill = Math.round((balance / totalOwed) * globalDiscount);
        }
        remainingDiscount -= discountForThisBill;
        
        bill.totalDiscount += discountForThisBill;
        bill.finalAmount -= discountForThisBill;
        if (isLab) {
          bill.balanceAmount -= discountForThisBill;
        } else {
          bill.totalBalance -= discountForThisBill;
        }
        balance -= discountForThisBill;
      }

      let paymentForThisBill = 0;
      if (remainingPayment > 0 && balance > 0) {
        paymentForThisBill = Math.min(remainingPayment, balance);
        remainingPayment -= paymentForThisBill;
        
        bill.payments.push({
          amount: paymentForThisBill,
          paymentMode: paymentMode || 'CASH',
          purpose: 'Consolidated Payment',
          paidAt: new Date(),
          note: 'Consolidated Payment' // lab order schema uses 'note', bill schema uses 'purpose'
        });

        bill.receivedAmount += paymentForThisBill;
        if (isLab) {
          bill.balanceAmount -= paymentForThisBill;
          bill.billStatus = bill.balanceAmount <= 0 ? 'Paid' : 'Partial';
        } else {
          bill.totalBalance -= paymentForThisBill;
        }
      }

      await bill.save();
    }

    broadcast('MERGED_BILL_PAYMENT', { updatedBillIds: billIds });
    res.json({ message: 'Merged payment successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing merged payment', error: error.message });
  }
};
