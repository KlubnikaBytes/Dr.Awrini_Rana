const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const LabOrder = require('../models/LabOrder');
const DayCare = require('../models/DayCare');
const HomeCare = require('../models/HomeCare');
const MedicineMeta = require('../models/MedicineMeta');
const Consultation = require('../models/Consultation');

// Helper to categorize service
const categorizeService = (serviceName) => {
  const name = (serviceName || '').toUpperCase();
  if (name.includes('CONSULT') || name.includes('VISIT')) return 'Consultation';
  if (name.includes('LAB') || name.includes('TEST') || name.includes('SCAN') || name.includes('X-RAY') || name.includes('BLOOD')) return 'Lab';
  if (name.includes('DAY CARE')) return 'Day Care';
  if (name.includes('HOME CARE')) return 'Home Care';
  return 'Other';
};

exports.getBillingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse dates to cover entire days
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = { billDate: { $gte: start, $lte: end } };
    if (req.clinicId) {
      query.clinicId = req.clinicId;
    }

    const bills = await Bill.find(query).populate('patient').lean();

    // Aggregate Data
    const summary = {
      total: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } },
      consultation: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } },
      lab: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } },
      dayCare: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } },
      homeCare: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } },
      other: { billed: 0, collected: 0, cash: 0, card: 0, upi: 0, breakdown: { cash: [], card: [], upi: [] } }
    };

    const pushBreakdown = (categoryObj, pKey, patientInfo, amount) => {
      if (amount <= 0) return;
      categoryObj.breakdown[pKey].push({
        patientId: patientInfo.patientId,
        name: patientInfo.name,
        phone: patientInfo.phone,
        amount: amount
      });
    };

    const patientIds = new Set();
    const newPatients = new Set();

    bills.forEach(bill => {
      // Track unique patients billed
      if (bill.patient && bill.patient._id) {
        patientIds.add(bill.patient._id.toString());
        // Check if patient registered in this date range
        const regDate = new Date(bill.patient.createdAt);
        if (regDate >= start && regDate <= end) {
          newPatients.add(bill.patient._id.toString());
        }
      }

      let billConsultBilled = 0;
      let billLabBilled = 0;
      let billDayCareBilled = 0;
      let billHomeCareBilled = 0;
      let billOtherBilled = 0;
      let billTotalBilled = 0;

      // Helper for categorizing this specific bill's items
      const getCategory = (item) => {
        if (item.serviceType && item.serviceType !== 'Other') return item.serviceType;
        if (bill.sourceType === 'DayCare') return 'Day Care';
        if (bill.sourceType === 'HomeCare') return 'Home Care';
        return categorizeService(item.serviceName);
      };

      // Calculate category billed ratio
      bill.items.forEach(item => {
        const category = getCategory(item);
        const amount = item.totalPrice || 0;
        billTotalBilled += amount;

        if (category === 'Consultation') billConsultBilled += amount;
        else if (category === 'Lab') billLabBilled += amount;
        else if (category === 'Day Care') billDayCareBilled += amount;
        else if (category === 'Home Care') billHomeCareBilled += amount;
        else billOtherBilled += amount;
      });

      // Update total billed
      summary.total.billed += billTotalBilled;
      summary.consultation.billed += billConsultBilled;
      summary.lab.billed += billLabBilled;
      summary.dayCare.billed += billDayCareBilled;
      summary.homeCare.billed += billHomeCareBilled;
      summary.other.billed += billOtherBilled;

      // Distribute payments across categories proportionally
      // For simplicity in a real clinic, payments are often bulk. We distribute them based on billed ratio.
      bill.payments.forEach(payment => {
        const amt = payment.amount;
        const mode = payment.paymentMode.toUpperCase();

        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'upi';

        const patInfo = {
          patientId: bill.patient?.patientId || '-',
          name: bill.patient?.name || 'Unknown',
          phone: bill.patient?.phone || ''
        };

        // Add to absolute total collected
        summary.total.collected += amt;
        summary.total[pKey] += amt;
        pushBreakdown(summary.total, pKey, patInfo, amt);

        if (billTotalBilled > 0) {
          const cRatio = billConsultBilled / billTotalBilled;
          const lRatio = billLabBilled / billTotalBilled;
          const dRatio = billDayCareBilled / billTotalBilled;
          const hRatio = billHomeCareBilled / billTotalBilled;
          const oRatio = billOtherBilled / billTotalBilled;

          summary.consultation.collected += (amt * cRatio);
          summary.consultation[pKey] += (amt * cRatio);
          pushBreakdown(summary.consultation, pKey, patInfo, amt * cRatio);
          
          summary.lab.collected += (amt * lRatio);
          summary.lab[pKey] += (amt * lRatio);
          pushBreakdown(summary.lab, pKey, patInfo, amt * lRatio);
          
          summary.dayCare.collected += (amt * dRatio);
          summary.dayCare[pKey] += (amt * dRatio);
          pushBreakdown(summary.dayCare, pKey, patInfo, amt * dRatio);
          
          summary.homeCare.collected += (amt * hRatio);
          summary.homeCare[pKey] += (amt * hRatio);
          pushBreakdown(summary.homeCare, pKey, patInfo, amt * hRatio);
          
          summary.other.collected += (amt * oRatio);
          summary.other[pKey] += (amt * oRatio);
          pushBreakdown(summary.other, pKey, patInfo, amt * oRatio);
        } else if (bill.items && bill.items.length > 0) {
          // If billed is 0, distribute evenly among the items in the bill
          const cCount = bill.items.filter(i => getCategory(i) === 'Consultation').length;
          const lCount = bill.items.filter(i => getCategory(i) === 'Lab').length;
          const dCount = bill.items.filter(i => getCategory(i) === 'Day Care').length;
          const hCount = bill.items.filter(i => getCategory(i) === 'Home Care').length;
          const oCount = bill.items.filter(i => getCategory(i) === 'Other').length;
          const totalCount = bill.items.length;

          summary.consultation.collected += (amt * (cCount / totalCount));
          summary.consultation[pKey] += (amt * (cCount / totalCount));
          pushBreakdown(summary.consultation, pKey, patInfo, amt * (cCount / totalCount));
          
          summary.lab.collected += (amt * (lCount / totalCount));
          summary.lab[pKey] += (amt * (lCount / totalCount));
          pushBreakdown(summary.lab, pKey, patInfo, amt * (lCount / totalCount));
          
          summary.dayCare.collected += (amt * (dCount / totalCount));
          summary.dayCare[pKey] += (amt * (dCount / totalCount));
          pushBreakdown(summary.dayCare, pKey, patInfo, amt * (dCount / totalCount));
          
          summary.homeCare.collected += (amt * (hCount / totalCount));
          summary.homeCare[pKey] += (amt * (hCount / totalCount));
          pushBreakdown(summary.homeCare, pKey, patInfo, amt * (hCount / totalCount));
          
          summary.other.collected += (amt * (oCount / totalCount));
          summary.other[pKey] += (amt * (oCount / totalCount));
          pushBreakdown(summary.other, pKey, patInfo, amt * (oCount / totalCount));
        } else {
          // Absolute fallback
          summary.other.collected += amt;
          summary.other[pKey] += amt;
          pushBreakdown(summary.other, pKey, patInfo, amt);
        }
      });
    });

    // ─── Also aggregate Lab billing from LabOrders ──────────────
    const labQuery = {
      billStatus: { $in: ['Partial', 'Paid'] },
      $or: [
        { billDate: { $gte: start, $lte: end } },
        { orderedDate: { $gte: start, $lte: end } }
      ]
    };
    if (req.clinicId) labQuery.clinicId = req.clinicId;
    const labOrders = await LabOrder.find(labQuery).lean();

    const tieUpMap = {};

    labOrders.forEach(order => {
      summary.total.billed += order.totalBilledAmount || 0;
      summary.lab.billed += order.totalBilledAmount || 0;

      let collectedForOrder = 0;

      (order.payments || []).forEach(payment => {
        const amt = payment.amount || 0;
        collectedForOrder += amt;
        const mode = (payment.paymentMode || 'CASH').toUpperCase();
        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'upi';

        const patInfo = {
          patientId: order.uhid || '-',
          name: order.patientName || 'Unknown',
          phone: order.patientPhone || ''
        };

        summary.total.collected += amt;
        summary.total[pKey] += amt;
        pushBreakdown(summary.total, pKey, patInfo, amt);
        
        summary.lab.collected += amt;
        summary.lab[pKey] += amt;
        pushBreakdown(summary.lab, pKey, patInfo, amt);
      });

      if (order.tieUpOrganization) {
        if (!tieUpMap[order.tieUpOrganization]) {
          tieUpMap[order.tieUpOrganization] = { organization: order.tieUpOrganization, billed: 0, collected: 0, count: 0 };
        }
        tieUpMap[order.tieUpOrganization].billed += (order.totalBilledAmount || 0);
        tieUpMap[order.tieUpOrganization].collected += collectedForOrder;
        tieUpMap[order.tieUpOrganization].count += 1;
      }
    });

    // ─── Aggregate DayCare billing ──────────────
    const dayCareQuery = {
      $or: [
        { admissionDate: { $gte: start, $lte: end } }
      ]
    };
    if (req.clinicId) dayCareQuery.clinicId = req.clinicId;
    const dayCares = await DayCare.find(dayCareQuery).lean();

    dayCares.forEach(dc => {
      summary.total.billed += dc.finalAmount || 0;
      summary.dayCare.billed += dc.finalAmount || 0;

      let collectedForOrder = 0;
      (dc.payments || []).forEach(payment => {
        const amt = payment.amount || 0;
        collectedForOrder += amt;
        const mode = (payment.paymentMode || 'CASH').toUpperCase();
        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'upi';

        const patInfo = {
          patientId: dc.uhid || '-',
          name: dc.patientName || 'Unknown',
          phone: dc.patientPhone || ''
        };

        summary.total.collected += amt;
        summary.total[pKey] += amt;
        pushBreakdown(summary.total, pKey, patInfo, amt);
        
        summary.dayCare.collected += amt;
        summary.dayCare[pKey] += amt;
        pushBreakdown(summary.dayCare, pKey, patInfo, amt);
      });
    });

    // ─── Aggregate HomeCare billing ──────────────
    const homeCareQuery = {
      $or: [
        { startDate: { $gte: start, $lte: end } }
      ]
    };
    if (req.clinicId) homeCareQuery.clinicId = req.clinicId;
    const homeCares = await HomeCare.find(homeCareQuery).lean();

    homeCares.forEach(hc => {
      summary.total.billed += hc.finalAmount || 0;
      summary.homeCare.billed += hc.finalAmount || 0;

      let collectedForOrder = 0;
      (hc.payments || []).forEach(payment => {
        const amt = payment.amount || 0;
        collectedForOrder += amt;
        const mode = (payment.paymentMode || 'CASH').toUpperCase();
        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'upi';

        const patInfo = {
          patientId: hc.uhid || '-',
          name: hc.patientName || 'Unknown',
          phone: hc.patientPhone || ''
        };

        summary.total.collected += amt;
        summary.total[pKey] += amt;
        pushBreakdown(summary.total, pKey, patInfo, amt);
        
        summary.homeCare.collected += amt;
        summary.homeCare[pKey] += amt;
        pushBreakdown(summary.homeCare, pKey, patInfo, amt);
      });
    });

    const tieUpReport = Object.values(tieUpMap);

    // Formatting chart data for a single bar (date range aggregate)
    // You could also group this by day if needed for a multi-bar chart
    const chartData = {
      dateRange: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      newRegistrations: newPatients.size,
      billedPatients: patientIds.size,
      consultations: summary.consultation.collected,
      lab: summary.lab.collected,
      dayCare: summary.dayCare.collected,
      homeCare: summary.homeCare.collected,
      others: summary.other.collected,
      totalEarnings: summary.total.collected
    };

    res.json({
      summary,
      chartData: [chartData], // Array for recharts
      tieUpReport
    });

  } catch (error) {
    console.error('Error generating billing report:', error);
    res.status(500).json({ error: 'Failed to generate billing report' });
  }
};

exports.getCareAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, sourceType } = req.query;

    if (!sourceType || !['DayCare', 'HomeCare', 'Consultation', 'Lab', 'Other'].includes(sourceType)) {
      return res.status(400).json({ error: 'Valid sourceType is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const summary = {
      totalBilled: 0,
      totalCollected: 0,
      totalBalance: 0,
      totalUniquePatients: 0
    };

    const collectorMap = {};
    const serviceMap = {};
    const uniquePatients = new Set();
    let billsCount = 0;

    const processItem = (itemPrice, totalItemSum, finalAmount, billCollected, serviceName, qty, collectorName) => {
      if (itemPrice <= 0) return;
      
      let ratio = 1;
      if (totalItemSum > 0) {
        ratio = itemPrice / totalItemSum;
      }
      
      const itemBilled = ratio * finalAmount;
      const itemCollected = ratio * billCollected;
      const itemBalance = Math.max(0, itemBilled - itemCollected);

      summary.totalBilled += itemBilled;
      summary.totalCollected += itemCollected;
      summary.totalBalance += itemBalance;

      const sName = serviceName || 'Unknown Service';
      if (!serviceMap[sName]) serviceMap[sName] = { name: sName, qty: 0, revenue: 0 };
      serviceMap[sName].qty += (qty || 1);
      serviceMap[sName].revenue += itemBilled;

      if (!collectorMap[collectorName]) {
        collectorMap[collectorName] = { name: collectorName, billed: 0, collected: 0, balance: 0, billsCount: 0 };
      }
      collectorMap[collectorName].billed += itemBilled;
      collectorMap[collectorName].collected += itemCollected;
      collectorMap[collectorName].balance += itemBalance;
    };

    // 1. Process mixed Bills from Frontdesk
    const query = { billDate: { $gte: start, $lte: end } };
    if (req.clinicId) query.clinicId = req.clinicId;

    const bills = await Bill.find(query).populate({ path: 'appointment', select: 'doctorName' }).lean();

    bills.forEach(bill => {
      let isRelevantBill = false;
      const processedCollectors = new Set();
      const billTotalItemSum = bill.totalBilledAmount || bill.finalAmount || 0;
      const billFinalAmount = bill.finalAmount || 0;
      const billCollected = bill.receivedAmount || 0;

      // Handle old bills where sourceType itself matches, but we still prorate item by item
      const isDayCareBill = bill.sourceType === 'DayCare';
      const isHomeCareBill = bill.sourceType === 'HomeCare';
      const isConsultationBill = bill.sourceType === 'Appointment';

      (bill.items || []).forEach(item => {
        let matches = false;
        let collectorName = 'Unknown';

        const catServiceType = item.serviceType || categorizeService(item.serviceName);

        if (sourceType === 'Consultation') {
          if (catServiceType === 'Consultation' || (isConsultationBill && catServiceType === 'Other')) {
            matches = true;
            collectorName = (bill.appointment && bill.appointment.doctorName) ? `Dr. ${bill.appointment.doctorName}` : (item.performedBy || bill.billedBy || 'Unknown Doctor');
          }
        } else if (sourceType === 'DayCare') {
          if (catServiceType === 'Day Care' || (isDayCareBill && catServiceType === 'Other')) {
            matches = true;
            collectorName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        } else if (sourceType === 'HomeCare') {
          if (catServiceType === 'Home Care' || (isHomeCareBill && catServiceType === 'Other')) {
            matches = true;
            collectorName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        } else if (sourceType === 'Lab') {
          if (catServiceType === 'Lab') {
            matches = true;
            collectorName = item.tieUpOrg || 'Own (ASR)';
          }
        } else if (sourceType === 'Other') {
          if (catServiceType === 'Other' && !isConsultationBill && !isDayCareBill && !isHomeCareBill) {
            matches = true;
            collectorName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        }

        if (matches) {
          isRelevantBill = true;
          processItem(item.totalPrice || 0, billTotalItemSum, billFinalAmount, billCollected, item.serviceName, item.qty, collectorName);
          processedCollectors.add(collectorName);
        }
      });

      if (isRelevantBill) {
        billsCount++;
        const patientId = bill.patient ? bill.patient.toString() : bill.patientName;
        if (patientId) uniquePatients.add(patientId);
        processedCollectors.forEach(c => {
          if (collectorMap[c]) collectorMap[c].billsCount += 1;
        });
      }
    });

    // 2. Process Native Modules (LabOrder, DayCare, HomeCare)
    if (sourceType === 'Lab') {
      const labQuery = { $or: [{ billDate: { $gte: start, $lte: end } }, { orderedDate: { $gte: start, $lte: end } }] };
      if (req.clinicId) labQuery.clinicId = req.clinicId;
      const labOrders = await LabOrder.find(labQuery).lean();

      labOrders.forEach(order => {
        billsCount++;
        uniquePatients.add(order.patientName || order.uhid || order._id.toString());
        const billed = order.totalBilledAmount || 0;
        let collected = 0;
        (order.payments || []).forEach(p => collected += (p.amount || 0));
        const referrer = order.tieUpOrganization || order.referredBy || 'Own (ASR)';

        if (billed > 0) {
          if (!collectorMap[referrer]) collectorMap[referrer] = { name: referrer, billed: 0, collected: 0, balance: 0, billsCount: 0 };
          collectorMap[referrer].billsCount += 1;
          (order.tests || []).forEach(test => {
            processItem(test.totalPrice || 0, billed, billed, collected, test.name, test.qty, referrer);
          });
        }
      });
    } else if (sourceType === 'DayCare') {
      const dcQuery = { admissionDate: { $gte: start, $lte: end } };
      if (req.clinicId) dcQuery.clinicId = req.clinicId;
      const dayCares = await DayCare.find(dcQuery).lean();

      dayCares.forEach(dc => {
        billsCount++;
        uniquePatients.add(dc.patientId ? dc.patientId.toString() : (dc.patientName || dc._id.toString()));
        const billed = dc.finalAmount || 0;
        let collected = 0;
        (dc.payments || []).forEach(p => collected += (p.amount || 0));
        const staff = dc.doctorName || dc.nurseInCharge || 'Unknown Staff';

        if (billed > 0) {
          if (!collectorMap[staff]) collectorMap[staff] = { name: staff, billed: 0, collected: 0, balance: 0, billsCount: 0 };
          collectorMap[staff].billsCount += 1;
          processItem(billed, billed, billed, collected, dc.reasonForAdmission || 'Day Care Service', 1, staff);
        }
      });
    } else if (sourceType === 'HomeCare') {
      const hcQuery = { startDate: { $gte: start, $lte: end } };
      if (req.clinicId) hcQuery.clinicId = req.clinicId;
      const homeCares = await HomeCare.find(hcQuery).lean();

      homeCares.forEach(hc => {
        billsCount++;
        uniquePatients.add(hc.patientId ? hc.patientId.toString() : (hc.patientName || hc._id.toString()));
        const billed = hc.totalBilledAmount || hc.finalAmount || 0;
        let collected = 0;
        (hc.payments || []).forEach(p => collected += (p.amount || 0));
        const staff = hc.assignedStaff || 'Unknown Staff';

        if (billed > 0) {
          if (!collectorMap[staff]) collectorMap[staff] = { name: staff, billed: 0, collected: 0, balance: 0, billsCount: 0 };
          collectorMap[staff].billsCount += 1;
          processItem(billed, billed, billed, collected, hc.serviceType || 'Home Care Service', 1, staff);
        }
      });
    }

    summary.totalUniquePatients = uniquePatients.size;

    const collectorAnalytics = Object.values(collectorMap).sort((a, b) => b.collected - a.collected);
    const serviceAnalytics = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

    res.json({
      summary,
      collectorAnalytics,
      serviceAnalytics,
      billsCount
    });

  } catch (error) {
    console.error('Error generating care analytics:', error);
    res.status(500).json({ error: 'Failed to generate care analytics' });
  }
};

exports.getReferralAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const clinicId = req.clinicId;

    const Consultation = require('../models/Consultation');
    const Bill = require('../models/Bill');
    const Patient = require('../models/Patient');

    const referredToStats = {};
    const referredByStats = {};

    const initStat = (obj, name) => {
      if (!obj[name]) {
        obj[name] = { doctorName: name, count: 0, cash: 0, upi: 0, card: 0, total: 0, patients: [] };
      }
    };

    const addFinancials = (obj, name, bill, patientInfo) => {
      initStat(obj, name);
      const stat = obj[name];
      if (bill) {
        const amt = bill.receivedAmount || 0;
        stat.total += amt;
        const mode = (bill.paymentMode || 'CASH').toUpperCase();
        if (mode === 'UPI') stat.upi += amt;
        else if (mode === 'CARD') stat.card += amt;
        else stat.cash += amt;
      }
      if (patientInfo && !stat.patients.some(p => p.patientId === patientInfo.patientId)) {
        stat.patients.push(patientInfo);
        stat.count += 1;
      }
    };

    // 1. All Bills in the date range
    const bills = await Bill.find({ clinicId, billDate: { $gte: start, $lte: end } })
      .populate('patient')
      .populate('appointment')
      .lean();

    // 2. Fetch consultations for these bills' appointments
    const apptIds = bills.filter(b => b.appointment).map(b => b.appointment._id);
    const consultations = await Consultation.find({ appointment: { $in: apptIds } }).lean();
    const consultMap = {};
    consultations.forEach(c => { if(c.appointment) consultMap[c.appointment.toString()] = c; });

    // 3. Process Bills
    bills.forEach(bill => {
      const patient = bill.patient;
      if (!patient) return;

      const patientInfo = {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        appointmentId: bill.appointment ? bill.appointment._id : null
      };

      // Referred By (Incoming)
      if (patient.referredByDoctor) {
        addFinancials(referredByStats, patient.referredByDoctor.toUpperCase(), bill, patientInfo);
      }

      // Referred To (Outgoing) - Look at Consultation for this bill
      if (bill.appointment) {
        const c = consultMap[bill.appointment._id.toString()];
        if (c && c.referredTo && Array.isArray(c.referredTo)) {
          c.referredTo.forEach(r => {
            if (r.doctorName) {
              addFinancials(referredToStats, r.doctorName.toUpperCase(), bill, patientInfo);
            }
          });
        }
      }
    });

    // 4. Also catch patients registered in this date range but not billed yet
    const patients = await Patient.find({ clinicId, createdAt: { $gte: start, $lte: end } }).lean();
    patients.forEach(p => {
      if (p.referredByDoctor) {
        initStat(referredByStats, p.referredByDoctor.toUpperCase());
        const stat = referredByStats[p.referredByDoctor.toUpperCase()];
        if (!stat.patients.some(existing => existing.patientId === p.patientId)) {
           stat.patients.push({ _id: p._id, patientId: p.patientId, name: p.name, phone: p.phone, appointmentId: null });
           stat.count += 1;
        }
      }
    });

    const sortedReferredTo = Object.values(referredToStats).sort((a, b) => b.total - a.total);
    const sortedReferredBy = Object.values(referredByStats).sort((a, b) => b.total - a.total);

    res.json({
      referredToStats: sortedReferredTo,
      referredByStats: sortedReferredBy
    });
  } catch (error) {
    console.error('Error generating referral analytics:', error);
    res.status(500).json({ error: 'Failed to generate referral analytics' });
  }
};

exports.getMedicineHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = { createdAt: { $gte: start, $lte: end } };
    if (req.clinicId) query.clinicId = req.clinicId;

    const consultations = await Consultation.find(query).lean();

    // Aggregate medicines
    const medicineCounts = {};

    consultations.forEach(c => {
      (c.medicines || []).forEach(med => {
        const name = (med.medicineName || '').trim();
        if (!name) return;

        const key = name.toLowerCase();
        if (!medicineCounts[key]) {
          medicineCounts[key] = { count: 0, display: name, genericName: med.genericName || '' };
        }
        medicineCounts[key].count += 1;
        if (!medicineCounts[key].genericName && med.genericName) {
          medicineCounts[key].genericName = med.genericName;
        }
      });
    });

    const uniqueNames = Object.values(medicineCounts).map(m => m.display);
    const metas = await MedicineMeta.find({
      clinicId: req.clinicId,
      medicineName: { $in: uniqueNames.map(n => new RegExp(`^${n}$`, 'i')) }
    }).lean();

    const metaMap = {};
    metas.forEach(m => {
      metaMap[m.medicineName.toLowerCase()] = m;
    });

    const result = Object.values(medicineCounts).map(m => {
      const key = m.display.toLowerCase();
      const meta = metaMap[key] || {};
      return {
        medicineName: m.display,
        count: m.count,
        genericName: meta.genericName || m.genericName,
        company: meta.company || '',
        mrName: meta.mrName || ''
      };
    });

    result.sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    console.error('Error fetching medicine history:', error);
    res.status(500).json({ error: 'Failed to fetch medicine history' });
  }
};

exports.getMedicinePatients = async (req, res) => {
  try {
    const { medicineName, startDate, endDate } = req.query;
    if (!medicineName) return res.status(400).json({ error: 'medicineName is required' });

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = {
      createdAt: { $gte: start, $lte: end },
      'medicines.medicineName': { $regex: new RegExp(`^${medicineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    };
    if (req.clinicId) query.clinicId = req.clinicId;

    const consultations = await Consultation.find(query)
      .populate({ path: 'patient', select: 'name patientId gender age phone' })
      .populate({ path: 'appointment', select: '_id doctorName date' })
      .sort({ createdAt: -1 })
      .lean();

    // Group by patient
    const patientMap = {};
    consultations.forEach(c => {
      const patId = c.patient?._id?.toString() || c._id?.toString();
      const name = c.patient?.name || 'Unknown Patient';
      const patientId = c.patient?.patientId || '—';
      const gender = c.patient?.gender || '';
      const age = c.patient?.age || '';
      const phone = c.patient?.phone || '';
      const doctor = c.appointment?.doctorName || '';
      const appointmentId = c.appointment?._id?.toString() || null;
      const date = c.createdAt;

      // count how many times this specific medicine appears in this consultation
      const medCount = (c.medicines || []).filter(m =>
        m.medicineName?.toLowerCase() === medicineName.toLowerCase()
      ).length;

      if (!patientMap[patId]) {
        patientMap[patId] = {
          patientId,
          patientName: name,
          gender,
          age,
          phone,
          totalCount: 0,
          prescriptions: [],   // [{date, doctor, appointmentId}]
          lastAppointmentId: null,
          lastDate: null
        };
      }
      patientMap[patId].totalCount += medCount;
      patientMap[patId].prescriptions.push({ date, doctor, appointmentId });
      // keep the most recent appointmentId for opening VisitPad
      if (!patientMap[patId].lastDate || new Date(date) > new Date(patientMap[patId].lastDate)) {
        patientMap[patId].lastDate = date;
        patientMap[patId].lastAppointmentId = appointmentId;
      }
    });

    const patients = Object.values(patientMap).sort((a, b) => b.totalCount - a.totalCount);

    res.json({ patients, medicineName, count: patients.length });
  } catch (error) {
    console.error('Error fetching medicine patients:', error);
    res.status(500).json({ error: 'Failed to fetch medicine patients' });
  }
};

exports.getAnalyticsPatients = async (req, res) => {
  try {
    const { sourceType, itemName, collectorName, startDate, endDate } = req.query;

    if (!sourceType || !['DayCare', 'HomeCare', 'Consultation', 'Lab', 'Other'].includes(sourceType)) {
      return res.status(400).json({ error: 'Valid sourceType is required' });
    }
    
    if (!itemName && !collectorName) {
      return res.status(400).json({ error: 'itemName or collectorName is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const patientsMap = new Map();

    const addPatient = (patientObj, serviceName, collector) => {
       if (itemName && serviceName !== itemName) return;
       if (collectorName && collector !== collectorName) return;

       const pId = patientObj._id ? patientObj._id.toString() : patientObj.patientName;
       if (!pId) return;
       
       if (!patientsMap.has(pId)) {
         patientsMap.set(pId, patientObj);
       }
    };

    // 1. Process mixed Bills from Frontdesk
    const query = { billDate: { $gte: start, $lte: end } };
    if (req.clinicId) query.clinicId = req.clinicId;
    const bills = await Bill.find(query).populate({ path: 'appointment', select: 'doctorName' }).populate('patient').lean();

    bills.forEach(bill => {
      const isDayCareBill = bill.sourceType === 'DayCare';
      const isHomeCareBill = bill.sourceType === 'HomeCare';
      const isConsultationBill = bill.sourceType === 'Appointment';

      (bill.items || []).forEach(item => {
        let matches = false;
        let cName = 'Unknown';
        const catServiceType = item.serviceType || categorizeService(item.serviceName);

        if (sourceType === 'Consultation') {
          if (catServiceType === 'Consultation' || (isConsultationBill && catServiceType === 'Other')) {
            matches = true;
            cName = (bill.appointment && bill.appointment.doctorName) ? `Dr. ${bill.appointment.doctorName}` : (item.performedBy || bill.billedBy || 'Unknown Doctor');
          }
        } else if (sourceType === 'DayCare') {
          if (catServiceType === 'Day Care' || (isDayCareBill && catServiceType === 'Other')) {
            matches = true;
            cName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        } else if (sourceType === 'HomeCare') {
          if (catServiceType === 'Home Care' || (isHomeCareBill && catServiceType === 'Other')) {
            matches = true;
            cName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        } else if (sourceType === 'Lab') {
          if (catServiceType === 'Lab') {
            matches = true;
            cName = item.tieUpOrg || 'Own (ASR)';
          }
        } else if (sourceType === 'Other') {
          if (catServiceType === 'Other' && !isConsultationBill && !isDayCareBill && !isHomeCareBill) {
            matches = true;
            cName = item.performedBy || bill.billedBy || 'Unknown Staff';
          }
        }

        if (matches) {
          const pObj = {
            _id: bill._id,
            patientName: bill.patient ? bill.patient.name : bill.patientName,
            patientPhone: bill.patient ? bill.patient.phone : '',
            date: bill.billDate || bill.createdAt,
            finalAmount: bill.finalAmount || 0,
            receivedAmount: bill.receivedAmount || 0,
            balanceAmount: bill.totalBalance || 0,
            billStatus: bill.totalBalance > 0 ? 'Due' : 'Paid',
            referredBy: cName
          };
          addPatient(pObj, item.serviceName || 'Unknown Service', cName);
        }
      });
    });

    // 2. Process Native Modules
    if (sourceType === 'Lab') {
      const labQuery = { $or: [{ billDate: { $gte: start, $lte: end } }, { orderedDate: { $gte: start, $lte: end } }] };
      if (req.clinicId) labQuery.clinicId = req.clinicId;
      const labOrders = await LabOrder.find(labQuery).populate('patient').lean();
      
      labOrders.forEach(order => {
        const referrer = order.tieUpOrganization || order.referredBy || 'Own (ASR)';
        (order.tests || []).forEach(test => {
          const pObj = {
            _id: order._id,
            patientName: order.patientName || (order.patient && order.patient.name),
            patientPhone: order.patientPhone || (order.patient && order.patient.phone),
            uhid: order.uhid,
            date: order.billDate || order.orderedDate || order.createdAt,
            finalAmount: order.totalBilledAmount || 0,
            receivedAmount: (order.payments || []).reduce((acc, p) => acc + (p.amount||0), 0),
            billStatus: order.billStatus,
            referredBy: referrer
          };
          addPatient(pObj, test.name || 'Unknown Test', referrer);
        });
      });
    } else if (sourceType === 'DayCare') {
      const dcQuery = { admissionDate: { $gte: start, $lte: end } };
      if (req.clinicId) dcQuery.clinicId = req.clinicId;
      const dayCares = await DayCare.find(dcQuery).lean();
      
      dayCares.forEach(dc => {
        const staff = dc.doctorName || dc.nurseInCharge || 'Unknown Staff';
        const pObj = {
          _id: dc._id,
          patientName: dc.patientName,
          patientPhone: dc.patientPhone,
          uhid: dc.uhid,
          date: dc.admissionDate || dc.createdAt,
          finalAmount: dc.finalAmount || 0,
          receivedAmount: (dc.payments || []).reduce((acc, p) => acc + (p.amount||0), 0),
          referredBy: staff
        };
        addPatient(pObj, dc.reasonForAdmission || 'Day Care Service', staff);
      });
    } else if (sourceType === 'HomeCare') {
      const hcQuery = { startDate: { $gte: start, $lte: end } };
      if (req.clinicId) hcQuery.clinicId = req.clinicId;
      const homeCares = await HomeCare.find(hcQuery).lean();
      
      homeCares.forEach(hc => {
        const staff = hc.assignedStaff || 'Unknown Staff';
        const pObj = {
          _id: hc._id,
          patientName: hc.patientName,
          patientPhone: hc.patientPhone,
          uhid: hc.uhid,
          date: hc.startDate || hc.createdAt,
          finalAmount: hc.finalAmount || hc.totalBilledAmount || 0,
          receivedAmount: (hc.payments || []).reduce((acc, p) => acc + (p.amount||0), 0),
          referredBy: staff
        };
        addPatient(pObj, hc.serviceType || 'Home Care Service', staff);
      });
    }

    const result = Array.from(patientsMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date));

    res.json({ patients: result, itemName, collectorName, count: result.length });
  } catch (error) {
    console.error('Error fetching analytics patients:', error);
    res.status(500).json({ error: 'Failed to fetch analytics patients' });
  }
};

exports.updateMedicineMeta = async (req, res) => {
  try {
    const { medicineName, genericName, company, mrName } = req.body;
    if (!medicineName) {
      return res.status(400).json({ error: 'medicineName is required' });
    }
    const updateData = {};
    if (genericName !== undefined) updateData.genericName = genericName;
    if (company !== undefined) updateData.company = company;
    if (mrName !== undefined) updateData.mrName = mrName;

    // Use findOneAndUpdate with upsert
    // regex ensures "Paracetamol" and "paracetamol" are matched
    const meta = await MedicineMeta.findOneAndUpdate(
      { medicineName: { $regex: new RegExp(`^${medicineName}$`, 'i') } },
      {
        $set: updateData,
        $setOnInsert: { medicineName: medicineName }
      },
      { new: true, upsert: true }
    );

    res.json(meta);
  } catch (error) {
    console.error('Error updating medicine meta:', error);
    res.status(500).json({ error: 'Failed to update medicine meta' });
  }
};
