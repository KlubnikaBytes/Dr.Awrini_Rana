const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const LabOrder = require('../models/LabOrder');

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

    const bills = await Bill.find(query).populate('patient');

    // Aggregate Data
    const summary = {
      total: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 },
      consultation: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 },
      lab: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 },
      dayCare: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 },
      homeCare: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 },
      other: { billed: 0, collected: 0, cash: 0, card: 0, wallet: 0, cheque: 0, bank: 0, insurance: 0, app: 0 }
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
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'wallet';

        // Add to absolute total collected
        summary.total.collected += amt;
        summary.total[pKey] += amt;

        if (billTotalBilled > 0) {
          const cRatio = billConsultBilled / billTotalBilled;
          const lRatio = billLabBilled / billTotalBilled;
          const dRatio = billDayCareBilled / billTotalBilled;
          const hRatio = billHomeCareBilled / billTotalBilled;
          const oRatio = billOtherBilled / billTotalBilled;

          summary.consultation.collected += (amt * cRatio);
          summary.consultation[pKey] += (amt * cRatio);
          summary.lab.collected += (amt * lRatio);
          summary.lab[pKey] += (amt * lRatio);
          summary.dayCare.collected += (amt * dRatio);
          summary.dayCare[pKey] += (amt * dRatio);
          summary.homeCare.collected += (amt * hRatio);
          summary.homeCare[pKey] += (amt * hRatio);
          summary.other.collected += (amt * oRatio);
          summary.other[pKey] += (amt * oRatio);
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
          summary.lab.collected += (amt * (lCount / totalCount));
          summary.lab[pKey] += (amt * (lCount / totalCount));
          summary.dayCare.collected += (amt * (dCount / totalCount));
          summary.dayCare[pKey] += (amt * (dCount / totalCount));
          summary.homeCare.collected += (amt * (hCount / totalCount));
          summary.homeCare[pKey] += (amt * (hCount / totalCount));
          summary.other.collected += (amt * (oCount / totalCount));
          summary.other[pKey] += (amt * (oCount / totalCount));
        } else {
          // Absolute fallback
          summary.other.collected += amt;
          summary.other[pKey] += amt;
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
    const labOrders = await LabOrder.find(labQuery);

    const tieUpMap = {};

    labOrders.forEach(order => {
      summary.total.billed += order.totalBilledAmount || 0;
      summary.lab.billed   += order.totalBilledAmount || 0;
      
      let collectedForOrder = 0;

      (order.payments || []).forEach(payment => {
        const amt = payment.amount || 0;
        collectedForOrder += amt;
        const mode = (payment.paymentMode || 'CASH').toUpperCase();
        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'wallet';

        summary.total.collected += amt;
        summary.total[pKey]     += amt;
        summary.lab.collected   += amt;
        summary.lab[pKey]       += amt;
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

    if (!sourceType || !['DayCare', 'HomeCare'].includes(sourceType)) {
      return res.status(400).json({ error: 'Valid sourceType (DayCare or HomeCare) is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = { 
      sourceType,
      billDate: { $gte: start, $lte: end }
    };
    
    if (req.clinicId) query.clinicId = req.clinicId;

    const bills = await Bill.find(query);

    // Analytics Aggregation
    const summary = {
      totalBilled: 0,
      totalCollected: 0,
      totalBalance: 0
    };

    const collectorMap = {};
    const serviceMap = {};

    bills.forEach(bill => {
      const billed = bill.finalAmount || 0;
      const collected = bill.receivedAmount || 0;
      const balance = bill.totalBalance || 0;

      summary.totalBilled += billed;
      summary.totalCollected += collected;
      summary.totalBalance += balance;

      // Group by BilledBy (Collector)
      const collector = bill.billedBy || 'Unknown Staff';
      if (!collectorMap[collector]) {
        collectorMap[collector] = { name: collector, billed: 0, collected: 0, balance: 0, billsCount: 0 };
      }
      collectorMap[collector].billed += billed;
      collectorMap[collector].collected += collected;
      collectorMap[collector].balance += balance;
      collectorMap[collector].billsCount += 1;

      // Group by Service/Test (Item)
      bill.items.forEach(item => {
        const serviceName = item.serviceName || 'Unknown Service';
        if (!serviceMap[serviceName]) {
          serviceMap[serviceName] = { name: serviceName, qty: 0, revenue: 0 };
        }
        serviceMap[serviceName].qty += (item.qty || 1);
        serviceMap[serviceName].revenue += (item.totalPrice || 0);
      });
    });

    const collectorAnalytics = Object.values(collectorMap).sort((a, b) => b.collected - a.collected);
    const serviceAnalytics = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

    res.json({
      summary,
      collectorAnalytics,
      serviceAnalytics,
      billsCount: bills.length
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
    
    const consultations = await Consultation.find({
      clinicId,
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const referredToStats = {};
    consultations.forEach(c => {
      if (c.referredTo && Array.isArray(c.referredTo)) {
        c.referredTo.forEach(r => {
          if (r.doctorName) {
            const name = r.doctorName.toUpperCase();
            if (!referredToStats[name]) {
              referredToStats[name] = { doctorName: r.doctorName, count: 0 };
            }
            referredToStats[name].count += 1;
          }
        });
      }
    });

    const patients = await Patient.find({
      clinicId,
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const referredByStats = {};
    patients.forEach(p => {
      if (p.referredByDoctor) {
        const name = p.referredByDoctor.toUpperCase();
        if (!referredByStats[name]) {
          referredByStats[name] = { doctorName: p.referredByDoctor, count: 0 };
        }
        referredByStats[name].count += 1;
      }
    });

    const labOrders = await LabOrder.find({
      clinicId,
      orderedDate: { $gte: start, $lte: end }
    }).lean();

    labOrders.forEach(lo => {
      if (lo.referredBy) {
        const name = lo.referredBy.toUpperCase();
        if (!referredByStats[name]) {
          referredByStats[name] = { doctorName: lo.referredBy, count: 0 };
        }
        referredByStats[name].count += 1;
      }
    });

    const sortedReferredTo = Object.values(referredToStats).sort((a, b) => b.count - a.count);
    const sortedReferredBy = Object.values(referredByStats).sort((a, b) => b.count - a.count);

    res.json({
      referredToStats: sortedReferredTo,
      referredByStats: sortedReferredBy
    });
  } catch (error) {
    console.error('Error generating referral analytics:', error);
    res.status(500).json({ error: 'Failed to generate referral analytics' });
  }
};

