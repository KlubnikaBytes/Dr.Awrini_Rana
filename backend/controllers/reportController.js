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

      // Calculate category billed ratio
      bill.items.forEach(item => {
        const category = categorizeService(item.serviceName);
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
          const cCount = bill.items.filter(i => categorizeService(i.serviceName) === 'Consultation').length;
          const lCount = bill.items.filter(i => categorizeService(i.serviceName) === 'Lab').length;
          const dCount = bill.items.filter(i => categorizeService(i.serviceName) === 'Day Care').length;
          const hCount = bill.items.filter(i => categorizeService(i.serviceName) === 'Home Care').length;
          const oCount = bill.items.filter(i => categorizeService(i.serviceName) === 'Other').length;
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

    labOrders.forEach(order => {
      summary.total.billed += order.totalBilledAmount || 0;
      summary.lab.billed   += order.totalBilledAmount || 0;

      (order.payments || []).forEach(payment => {
        const amt = payment.amount || 0;
        const mode = (payment.paymentMode || 'CASH').toUpperCase();
        let pKey = 'cash';
        if (mode === 'CARD') pKey = 'card';
        else if (mode === 'UPI' || mode === 'NETBANKING') pKey = 'wallet';

        summary.total.collected += amt;
        summary.total[pKey]     += amt;
        summary.lab.collected   += amt;
        summary.lab[pKey]       += amt;
      });
    });

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
      chartData: [chartData] // Array for recharts
    });

  } catch (error) {
    console.error('Error generating billing report:', error);
    res.status(500).json({ error: 'Failed to generate billing report' });
  }
};

