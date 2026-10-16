const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const LabOrder = require('../models/LabOrder');
const DayCare = require('../models/DayCare');
const HomeCare = require('../models/HomeCare');
const { broadcast } = require('../websocket');

// Helper to normalize LabOrder into a bill-like format for the frontend
const formatLabOrderAsBill = (order) => {
  const fAmt = Number(order.finalAmount || 0);
  const rAmt = Number(order.receivedAmount || 0);
  const bAmt = (order.balanceAmount !== undefined && order.balanceAmount !== null && (rAmt > 0 || order.balanceAmount > 0))
    ? Number(order.balanceAmount)
    : Math.max(0, parseFloat((fAmt - rAmt).toFixed(2)));

  return {
    _id: order._id,
    isLabOrder: true,
    sourceType: 'Lab',
    patientName: order.patientName,
    billDate: order.billDate || order.createdAt,
    createdAt: order.createdAt,
    items: (order.tests || []).map(t => ({
      serviceName: t.name,
      serviceType: 'Lab',
      qty: t.qty || 1,
      unitPrice: t.unitPrice || 0,
      gstPercent: t.tax || 0,
      discount: t.discount || 0,
      totalPrice: t.totalPrice || 0
    })),
    payments: order.payments || [],
    totalBilledAmount: order.totalBilledAmount || fAmt,
    totalDiscount: order.totalDiscount || 0,
    totalTax: order.totalTax || 0,
    finalAmount: fAmt,
    receivedAmount: rAmt,
    totalBalance: bAmt,
    billNo: order.uhid ? `LAB-${order.uhid}` : 'LAB'
  };
};

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

    // Exclude lab orders that are already linked to an existing Bill to prevent double counting
    const linkedLabOrderIds = new Set(
      bills.map(b => b.labOrder?.toString()).filter(Boolean)
    );
    const unlinkedLabOrders = labOrders.filter(l => !linkedLabOrderIds.has(l._id.toString()));

    // 5. Combine and sort
    const formattedLabOrders = unlinkedLabOrders.map(formatLabOrderAsBill);
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
    normalBills.forEach(b => {
      const bal = (b.totalBalance !== undefined && b.totalBalance !== null && (b.receivedAmount > 0 || b.totalBalance > 0))
        ? Number(b.totalBalance)
        : Math.max(0, Number(b.finalAmount || 0) - Number(b.receivedAmount || 0));
      b.totalBalance = bal;
      totalOwed += bal;
    });
    labOrders.forEach(b => {
      const bal = (b.balanceAmount !== undefined && b.balanceAmount !== null && (b.receivedAmount > 0 || b.balanceAmount > 0))
        ? Number(b.balanceAmount)
        : Math.max(0, Number(b.finalAmount || 0) - Number(b.receivedAmount || 0));
      b.balanceAmount = bal;
      totalOwed += bal;
    });

    if (paymentAmount > 0 && totalOwed <= 0) {
      return res.status(400).json({ message: 'Selected bills are already fully paid.' });
    }

    let remainingDiscount = globalDiscount || 0;
    let remainingPayment = paymentAmount || 0;
    const allBills = [...normalBills, ...labOrders];

    for (let i = 0; i < allBills.length; i++) {
      const bill = allBills[i];
      const isLab = !!bill.tests; // LabOrder has 'tests' instead of 'items'
      
      let balance = isLab ? bill.balanceAmount : bill.totalBalance;
      if (balance <= 0 && remainingPayment > 0) continue;

      let discountForThisBill = 0;
      if (remainingDiscount > 0) {
        if (i === allBills.length - 1) {
          discountForThisBill = remainingDiscount;
        } else {
          discountForThisBill = totalOwed > 0 ? Math.round((balance / totalOwed) * globalDiscount) : 0;
        }
        discountForThisBill = Math.min(discountForThisBill, remainingDiscount);
        remainingDiscount -= discountForThisBill;
        
        bill.totalDiscount = (bill.totalDiscount || 0) + discountForThisBill;
        bill.finalAmount = Math.max(0, (bill.finalAmount || 0) - discountForThisBill);
        if (isLab) {
          bill.balanceAmount = Math.max(0, (bill.balanceAmount || 0) - discountForThisBill);
          balance = bill.balanceAmount;
          // Distribute discount into tests
          const tGross = (bill.tests || []).reduce((s, t) => s + ((parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1)), 0);
          if (tGross > 0) {
            bill.tests.forEach(t => {
              const tg = (parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1);
              const td = Math.round((tg / tGross) * bill.totalDiscount);
              t.discount = td;
              t.totalPrice = Math.max(0, tg - td + (((tg - td) * (parseFloat(t.tax) || 0)) / 100));
            });
          }
        } else {
          bill.totalBalance = Math.max(0, (bill.totalBalance || 0) - discountForThisBill);
          balance = bill.totalBalance;
          // Distribute discount into items
          const iGross = (bill.items || []).reduce((s, it) => s + ((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1)), 0);
          if (iGross > 0) {
            bill.items.forEach(it => {
              const ig = (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1);
              const id = Math.round((ig / iGross) * bill.totalDiscount);
              it.discount = id;
              it.totalPrice = Math.max(0, ig - id + (((ig - id) * (parseFloat(it.gstPercent) || 0)) / 100));
            });
          }
        }
      }

      let paymentForThisBill = 0;
      if (remainingPayment > 0 && balance > 0) {
        paymentForThisBill = Math.min(remainingPayment, balance);
        remainingPayment -= paymentForThisBill;
        
        const inferredServiceType = isLab ? 'Lab' : (bill.items?.[0]?.serviceType || (bill.sourceType === 'DayCare' ? 'Day Care' : bill.sourceType === 'HomeCare' ? 'Home Care' : 'Consultation'));

        bill.payments.push({
          amount: paymentForThisBill,
          paymentMode: paymentMode || 'CASH',
          purpose: isLab ? 'Lab Payment' : `${inferredServiceType} Payment`,
          serviceType: inferredServiceType,
          paidAt: new Date(),
          note: isLab ? 'Consolidated Payment' : undefined
        });

        bill.receivedAmount += paymentForThisBill;
        if (isLab) {
          bill.balanceAmount = Math.max(0, bill.finalAmount - bill.receivedAmount);
          bill.billStatus = bill.balanceAmount <= 0 ? 'Paid' : 'Partial';
        } else {
          bill.totalBalance = Math.max(0, bill.finalAmount - bill.receivedAmount);
        }
      }

      await bill.save();
    }

    broadcast('MERGED_BILL_PAYMENT', { updatedBillIds: billIds, clinicId: req.clinicId });
    broadcast('BILL_UPDATED', { updatedBillIds: billIds, clinicId: req.clinicId });
    broadcast('LAB_ORDER_UPDATED', { clinicId: req.clinicId });
    broadcast('APPOINTMENT_UPDATED', { clinicId: req.clinicId });
    res.json({ message: 'Merged payment successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing merged payment', error: error.message });
  }
};

// POST /api/bills/update-discount
exports.updateDiscount = async (req, res) => {
  try {
    const { billIds, billId, targetCategory = 'ALL', discount = 0, items } = req.body;
    const targetBillIds = (billIds && billIds.length > 0) ? billIds : (billId ? [billId] : []);

    if (targetBillIds.length === 0) {
      return res.status(400).json({ message: 'No bills specified to update discount' });
    }

    // Find all matching Bills and LabOrders
    const normalBills = await Bill.find({ _id: { $in: targetBillIds }, clinicId: req.clinicId });
    const labOrders = await LabOrder.find({ _id: { $in: targetBillIds }, clinicId: req.clinicId });

    if (normalBills.length === 0 && labOrders.length === 0) {
      return res.status(404).json({ message: 'No valid bills found to update discount' });
    }

    const normCat = (targetCategory || 'ALL').trim().toLowerCase();
    const isAll = normCat === 'all' || normCat === '';

    // Helper to test if item belongs to category
    const isItemInCat = (item, isLabOrder = false) => {
      if (isAll) return true;
      const st = (item.serviceType || '').toLowerCase();
      const sn = (item.serviceName || '').toLowerCase();
      if (normCat === 'lab') {
        return isLabOrder || st === 'lab' || sn.includes('lab') || sn.includes('test');
      }
      if (normCat === 'day care' || normCat === 'daycare') {
        return st === 'day care' || st === 'daycare' || sn.includes('day care') || sn.includes('daycare');
      }
      if (normCat === 'home care' || normCat === 'homecare') {
        return st === 'home care' || st === 'homecare' || sn.includes('home care') || sn.includes('homecare');
      }
      if (normCat === 'consultation') {
        return !isLabOrder && (st === 'consultation' || (!st && sn.includes('consult')) || (!st && !sn.includes('day') && !sn.includes('home') && !sn.includes('lab')));
      }
      return st === normCat;
    };

    // If explicit items array passed:
    if (items && Array.isArray(items) && items.length > 0) {
      // Map discounts from items array
      for (const b of normalBills) {
        b.items.forEach(it => {
          const matched = items.find(ui => (ui._id && it._id && ui._id.toString() === it._id.toString()) || (ui.serviceName === it.serviceName && ui.serviceType === it.serviceType));
          if (matched && matched.discount !== undefined) {
            const disc = Math.max(0, parseFloat(matched.discount) || 0);
            const unitPrice = parseFloat(it.unitPrice) || 0;
            const qty = parseInt(it.qty) || 1;
            const lineGross = unitPrice * qty;
            const gst = parseFloat(it.gstPercent) || 0;
            const cappedDisc = Math.min(disc, lineGross);
            const tax = ((lineGross - cappedDisc) * gst) / 100;
            it.discount = cappedDisc;
            it.totalPrice = Math.max(0, parseFloat((lineGross - cappedDisc + tax).toFixed(2)));
          }
        });
        b.totalBilledAmount = b.items.reduce((s, it) => s + ((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1)), 0);
        b.totalDiscount = b.items.reduce((s, it) => s + (parseFloat(it.discount) || 0), 0);
        b.totalTax = b.items.reduce((s, it) => s + ((((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1) - (parseFloat(it.discount) || 0)) * (parseFloat(it.gstPercent) || 0)) / 100), 0);
        b.finalAmount = Math.max(0, parseFloat((b.totalBilledAmount - b.totalDiscount + b.totalTax).toFixed(2)));
        b.totalBalance = Math.max(0, parseFloat((b.finalAmount - (b.receivedAmount || 0)).toFixed(2)));
        await b.save();
      }

      for (const lo of labOrders) {
        lo.tests.forEach(t => {
          const matched = items.find(ui => (ui._id && t._id && ui._id.toString() === t._id.toString()) || ui.serviceName === t.name);
          if (matched && matched.discount !== undefined) {
            const disc = Math.max(0, parseFloat(matched.discount) || 0);
            const unitPrice = parseFloat(t.unitPrice) || 0;
            const qty = parseInt(t.qty) || 1;
            const lineGross = unitPrice * qty;
            const gst = parseFloat(t.tax) || 0;
            const cappedDisc = Math.min(disc, lineGross);
            const tax = ((lineGross - cappedDisc) * gst) / 100;
            t.discount = cappedDisc;
            t.totalPrice = Math.max(0, parseFloat((lineGross - cappedDisc + tax).toFixed(2)));
          }
        });
        lo.totalBilledAmount = lo.tests.reduce((s, t) => s + ((parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1)), 0);
        lo.totalDiscount = lo.tests.reduce((s, t) => s + (parseFloat(t.discount) || 0), 0);
        lo.totalTax = lo.tests.reduce((s, t) => s + ((((parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1) - (parseFloat(t.discount) || 0)) * (parseFloat(t.tax) || 0)) / 100), 0);
        lo.finalAmount = Math.max(0, parseFloat((lo.totalBilledAmount - lo.totalDiscount + lo.totalTax).toFixed(2)));
        lo.balanceAmount = Math.max(0, parseFloat((lo.finalAmount - (lo.receivedAmount || 0)).toFixed(2)));
        lo.billStatus = lo.balanceAmount <= 0 ? 'Paid' : (lo.receivedAmount > 0 ? 'Partial' : 'Unbilled');
        await lo.save();
      }
    } else {
      // Numerical discount provided for targetCategory
      const desiredDiscount = Math.max(0, parseFloat(discount) || 0);

      // Collect all matching items
      const targetItems = [];
      normalBills.forEach(b => {
        (b.items || []).forEach(it => {
          if (isItemInCat(it, false)) {
            targetItems.push({
              item: it,
              type: 'bill_item',
              bill: b,
              gross: (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1),
              gst: parseFloat(it.gstPercent) || 0
            });
          }
        });
      });

      labOrders.forEach(lo => {
        (lo.tests || []).forEach(t => {
          if (isItemInCat({ serviceName: t.name, serviceType: 'Lab' }, true)) {
            targetItems.push({
              item: t,
              type: 'lab_test',
              labOrder: lo,
              gross: (parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1),
              gst: parseFloat(t.tax) || 0
            });
          }
        });
      });

      const totalTargetGross = targetItems.reduce((s, ti) => s + ti.gross, 0);
      const cappedDiscount = Math.min(desiredDiscount, totalTargetGross);

      let remainingDisc = cappedDiscount;
      for (let i = 0; i < targetItems.length; i++) {
        const ti = targetItems[i];
        let itemDisc = 0;
        if (totalTargetGross > 0 && remainingDisc > 0) {
          if (i === targetItems.length - 1) {
            itemDisc = Math.min(ti.gross, remainingDisc);
          } else {
            itemDisc = Math.min(ti.gross, Math.round((ti.gross / totalTargetGross) * cappedDiscount));
            itemDisc = Math.min(itemDisc, remainingDisc);
          }
        }
        remainingDisc -= itemDisc;
        ti.item.discount = itemDisc;
        const tax = ((ti.gross - itemDisc) * ti.gst) / 100;
        ti.item.totalPrice = Math.max(0, parseFloat((ti.gross - itemDisc + tax).toFixed(2)));
      }

      // Recalculate normalBills
      for (const b of normalBills) {
        b.totalBilledAmount = b.items.reduce((s, it) => s + ((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1)), 0);
        b.totalDiscount = b.items.reduce((s, it) => s + (parseFloat(it.discount) || 0), 0);
        b.totalTax = b.items.reduce((s, it) => s + ((((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1) - (parseFloat(it.discount) || 0)) * (parseFloat(it.gstPercent) || 0)) / 100), 0);
        b.finalAmount = Math.max(0, parseFloat((b.totalBilledAmount - b.totalDiscount + b.totalTax).toFixed(2)));
        b.totalBalance = Math.max(0, parseFloat((b.finalAmount - (b.receivedAmount || 0)).toFixed(2)));
        await b.save();
      }

      // Recalculate labOrders
      for (const lo of labOrders) {
        lo.totalBilledAmount = lo.tests.reduce((s, t) => s + ((parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1)), 0);
        lo.totalDiscount = lo.tests.reduce((s, t) => s + (parseFloat(t.discount) || 0), 0);
        lo.totalTax = lo.tests.reduce((s, t) => s + ((((parseFloat(t.unitPrice) || 0) * (parseInt(t.qty) || 1) - (parseFloat(t.discount) || 0)) * (parseFloat(t.tax) || 0)) / 100), 0);
        lo.finalAmount = Math.max(0, parseFloat((lo.totalBilledAmount - lo.totalDiscount + lo.totalTax).toFixed(2)));
        lo.balanceAmount = Math.max(0, parseFloat((lo.finalAmount - (lo.receivedAmount || 0)).toFixed(2)));
        lo.billStatus = lo.balanceAmount <= 0 ? 'Paid' : (lo.receivedAmount > 0 ? 'Partial' : 'Unbilled');
        await lo.save();
      }
    }

    // Sync any linked bill for lab orders
    for (const lo of labOrders) {
      const linkedBill = await Bill.findOne({ labOrder: lo._id });
      if (linkedBill) {
        const nonLabItems = linkedBill.items.filter(i => i.serviceType !== 'Lab');
        const newLabItems = (lo.tests || []).map(t => ({
          serviceName: t.name,
          serviceType: 'Lab',
          qty: t.qty || 1,
          unitPrice: t.unitPrice || 0,
          gstPercent: t.tax || 0,
          discount: t.discount || 0,
          totalPrice: t.totalPrice || 0
        }));
        linkedBill.items = [...nonLabItems, ...newLabItems];
        linkedBill.totalBilledAmount = linkedBill.items.reduce((s, it) => s + ((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1)), 0);
        linkedBill.totalDiscount = linkedBill.items.reduce((s, it) => s + (parseFloat(it.discount) || 0), 0);
        linkedBill.totalTax = linkedBill.items.reduce((s, it) => s + ((((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1) - (parseFloat(it.discount) || 0)) * (parseFloat(it.gstPercent) || 0)) / 100), 0);
        linkedBill.finalAmount = Math.max(0, parseFloat((linkedBill.totalBilledAmount - linkedBill.totalDiscount + linkedBill.totalTax).toFixed(2)));
        linkedBill.totalBalance = Math.max(0, parseFloat((linkedBill.finalAmount - (linkedBill.receivedAmount || 0)).toFixed(2)));
        await linkedBill.save();
      }
    }

    broadcast('BILL_UPDATED', { updatedBillIds: targetBillIds, clinicId: req.clinicId });
    broadcast('LAB_ORDER_UPDATED', { clinicId: req.clinicId });
    broadcast('LABORDER_UPDATED', { action: 'billed', clinicId: req.clinicId });
    broadcast('APPOINTMENT_UPDATED', { clinicId: req.clinicId });
    broadcast('DAYCARE_UPDATED', { action: 'updated', clinicId: req.clinicId });
    broadcast('HOMECARE_UPDATED', { action: 'updated', clinicId: req.clinicId });
    broadcast('MERGED_BILL_PAYMENT', { updatedBillIds: targetBillIds, clinicId: req.clinicId });

    res.json({ message: 'Discount updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating discount', error: error.message });
  }
};
