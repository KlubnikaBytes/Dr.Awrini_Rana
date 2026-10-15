import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, Mail, Trash2 } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import clinicService from '../../services/clinicService';
import { sendDocumentAsEmail } from '../../services/emailService';
import { generateA5BillHTML } from '../../utils/printA5Bill';

const PaymentModal = ({ appointment, initialCategory = 'ALL', onClose, onUpdate, handlePrintBill }) => {
  const [activeTab, setActiveTab] = useState('Payment');
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [payCategory, setPayCategory] = useState(initialCategory || 'ALL');
  const [payMode, setPayMode] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');

  const [discountVal, setDiscountVal] = useState('');

  const [refundMode, setRefundMode] = useState('CASH');
  const [refundAmount, setRefundAmount] = useState('');

  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailing, setEmailing] = useState(false);
  const [clinicData, setClinicData] = useState(null);

  // Pre-fill email from patient record
  useEffect(() => {
    const patient = appointment?.patient;
    if (patient?.email) setEmailInput(patient.email);
  }, [appointment]);

  // Synchronize category if changed from caller
  useEffect(() => {
    if (initialCategory) {
      setPayCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    fetchBill();
    // Fetch clinic data for logo/phone in bill PDF
    clinicService.getAllClinics().then(allClinics => {
      const storedClinicId = localStorage.getItem('clinicId') || '';
      const storedClinicName = localStorage.getItem('clinicName') || '';
      const matched = allClinics.find(c =>
        c._id === storedClinicId ||
        c.name?.toLowerCase() === storedClinicName?.toLowerCase()
      ) || allClinics[0] || null;
      setClinicData(matched);
    }).catch(console.error);
    // eslint-disable-next-line
  }, [appointment]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const patientUhid = appointment?.patient?.patientId || appointment?.patient?.uhid;
      let bills = [];
      if (patientUhid) {
        bills = await frontdeskService.getBills({ patientId: patientUhid });
      }
      if ((!bills || bills.length === 0) && appointment?._id) {
        bills = await frontdeskService.getBills({ appointmentId: appointment._id });
      }

      if (!bills || bills.length === 0) {
        setBill(null);
        return;
      }

      // Filter bills for this specific appointment / visit date
      let visitBills = bills;
      if (appointment) {
        const appDateStr = (appointment.date ? new Date(appointment.date) : new Date(appointment.createdAt)).toISOString().split('T')[0];
        const matched = bills.filter(b => {
          if (b.appointment && b.appointment.toString() === appointment._id?.toString()) return true;
          if (b.billDate) {
            const bDate = new Date(b.billDate);
            if (!isNaN(bDate) && bDate.toISOString().split('T')[0] === appDateStr) return true;
          }
          if (!b.billDate && b.createdAt) {
            const cDate = new Date(b.createdAt);
            if (!isNaN(cDate) && cDate.toISOString().split('T')[0] === appDateStr) return true;
          }
          return false;
        });
        if (matched.length > 0) {
          visitBills = matched;
        }
      }

      // Filter out lab orders that are already linked to an existing bill in visitBills (avoid duplicate counts)
      const linkedLabOrderIds = new Set(
        visitBills.map(b => b.labOrder?.toString()).filter(Boolean)
      );
      visitBills = visitBills.filter(b => !b.isLabOrder || !linkedLabOrderIds.has(b._id?.toString()));

      if (visitBills.length === 1) {
        const b = { ...visitBills[0] };
        const finalAmt = Number(b.finalAmount || 0);
        const recvAmt = Number(b.receivedAmount || 0);
        b.totalBalance = (b.totalBalance !== undefined && b.totalBalance !== null && (recvAmt > 0 || b.totalBalance > 0))
          ? Number(b.totalBalance)
          : Math.max(0, finalAmt - recvAmt);
        setBill(b);
        setDiscountVal(b.totalDiscount || '');
      } else {
        // Consolidate all bills for this visit
        const consolidated = {
          _id: 'CONSOLIDATED',
          isConsolidated: true,
          relatedBills: visitBills,
          billNo: visitBills.map(b => b.billNo).filter(Boolean).join(', ') || 'MULTIPLE',
          billDate: visitBills[0].billDate || visitBills[0].createdAt,
          patient: appointment.patient,
          items: visitBills.flatMap(b => (b.items || []).map(it => ({
            ...it,
            serviceType: it.serviceType || (b.isLabOrder || b.tests ? 'Lab' : (b.sourceType === 'DayCare' ? 'Day Care' : b.sourceType === 'HomeCare' ? 'Home Care' : 'Consultation'))
          }))),
          payments: visitBills.flatMap(b => (b.payments || []).map(p => ({
            ...p,
            billId: b._id,
            serviceType: p.serviceType || (b.isLabOrder || b.tests ? 'Lab' : (b.sourceType === 'DayCare' ? 'Day Care' : b.sourceType === 'HomeCare' ? 'Home Care' : 'Consultation'))
          }))).sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt)),
          totalBilledAmount: visitBills.reduce((s, b) => s + Number(b.totalBilledAmount || b.finalAmount || 0), 0),
          totalDiscount: visitBills.reduce((s, b) => s + Number(b.totalDiscount || 0), 0),
          totalTax: visitBills.reduce((s, b) => s + Number(b.totalTax || 0), 0),
          finalAmount: visitBills.reduce((s, b) => s + Number(b.finalAmount || 0), 0),
          receivedAmount: visitBills.reduce((s, b) => s + Number(b.receivedAmount || 0), 0),
          totalBalance: visitBills.reduce((s, b) => {
            const bal = (b.totalBalance !== undefined && b.totalBalance !== null && (b.receivedAmount > 0 || b.totalBalance > 0))
              ? Number(b.totalBalance)
              : Math.max(0, Number(b.finalAmount || 0) - Number(b.receivedAmount || 0));
            return s + bal;
          }, 0)
        };
        setBill(consolidated);
        setDiscountVal(consolidated.totalDiscount || '');
      }
    } catch (err) {
      console.error('fetchBill error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryForItem = (item) => {
    const st = item.serviceType;
    const name = (item.serviceName || '').toLowerCase();
    if (st === 'Day Care' || st === 'DayCare') return 'Day Care';
    if (st === 'Home Care' || st === 'HomeCare') return 'Home Care';
    if (st === 'Lab') return 'Lab';
    if (st === 'Consultation' || (!st && name.includes('consult'))) return 'Consultation';
    return st || 'Other';
  };

  const categoryBreakdown = useMemo(() => {
    if (!bill || !bill.items) return {};
    const map = {};
    bill.items.forEach(it => {
      if (!it.serviceName) return;
      const cat = getCategoryForItem(it);
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          gross: 0,
          discount: 0,
          gst: 0,
          billed: 0,
          received: 0,
          due: 0
        };
      }
      const qty = Number(it.qty || 1);
      const uPrice = Number(it.unitPrice || 0);
      const gross = qty * uPrice;
      const disc = Number(it.discount || 0);
      const tax = Number(it.gstPercent || 0) > 0 ? ((gross - disc) * Number(it.gstPercent) / 100) : 0;
      const net = Number(it.totalPrice !== undefined ? it.totalPrice : (gross - disc + tax));

      map[cat].gross += gross > 0 ? gross : net;
      map[cat].discount += disc;
      map[cat].gst += tax;
      map[cat].billed += net;
    });

    const bFinal = Number(bill.finalAmount || 0);
    const bRecv = Number(bill.receivedAmount || 0);
    const bBal = (bill.totalBalance !== undefined && bill.totalBalance !== null && (bRecv > 0 || bill.totalBalance > 0))
      ? Number(bill.totalBalance)
      : Math.max(0, bFinal - bRecv);

    if (bFinal > 0 && bBal <= 0 && bRecv >= bFinal) {
      Object.values(map).forEach(c => { c.received = c.billed; c.due = 0; });
    } else {
      let unassignedPaid = 0;
      (bill.payments || []).forEach(p => {
        const pAmt = Number(p.amount) || 0;
        const pSvc = (p.serviceType || '').trim().toLowerCase();
        const pPurp = (p.purpose || '').trim().toLowerCase();
        let matchedCat = null;
        if (pSvc === 'consultation' || (!pSvc && pPurp.includes('consult'))) matchedCat = 'Consultation';
        else if (pSvc === 'lab' || (!pSvc && (pPurp.includes('lab') || pPurp.includes('test')))) matchedCat = 'Lab';
        else if (pSvc === 'day care' || pSvc === 'daycare' || (!pSvc && (pPurp.includes('day care') || pPurp.includes('daycare')))) matchedCat = 'Day Care';
        else if (pSvc === 'home care' || pSvc === 'homecare' || (!pSvc && (pPurp.includes('home care') || pPurp.includes('homecare')))) matchedCat = 'Home Care';
        else if (pSvc === 'other') matchedCat = 'Other';

        if (matchedCat && map[matchedCat]) map[matchedCat].received += pAmt;
        else unassignedPaid += pAmt;
      });

      if (unassignedPaid > 0) {
        const cats = Object.values(map);
        const remDue = cats.reduce((s, c) => s + Math.max(0, c.billed - c.received), 0);
        if (remDue > 0) {
          cats.forEach(c => {
            const curDue = Math.max(0, c.billed - c.received);
            c.received += Math.min(curDue, unassignedPaid * (curDue / remDue));
          });
        }
      }

      Object.values(map).forEach(c => {
        c.received = Math.min(c.billed, parseFloat(c.received.toFixed(2)));
        c.due = Math.max(0, parseFloat((c.billed - c.received).toFixed(2)));
      });
    }
    return map;
  }, [bill]);

  // Match category case-insensitively with available categories
  const resolvedCategory = useMemo(() => {
    if (!payCategory || payCategory.toUpperCase() === 'ALL') return 'ALL';
    const keys = Object.keys(categoryBreakdown);
    const matched = keys.find(k => k.toLowerCase() === payCategory.toLowerCase());
    return matched || payCategory;
  }, [payCategory, categoryBreakdown]);

  // Dynamic summary values matching currently selected category
  const currentSummary = useMemo(() => {
    if (!bill) {
      return {
        gross: 0,
        discount: 0,
        gst: 0,
        netBilled: 0,
        collected: 0,
        netPaid: 0,
        balance: 0,
        label: 'Total'
      };
    }

    if (resolvedCategory === 'ALL') {
      const bFinal = Number(bill.finalAmount || 0);
      const bRecv = Number(bill.receivedAmount || 0);
      const bBal = (bill.totalBalance !== undefined && bill.totalBalance !== null && (bRecv > 0 || bill.totalBalance > 0))
        ? Number(bill.totalBalance)
        : Math.max(0, bFinal - bRecv);

      return {
        gross: Number(bill.totalBilledAmount ?? bFinal),
        discount: Number(bill.totalDiscount || 0),
        gst: Number(bill.totalTax || 0),
        netBilled: bFinal,
        collected: bRecv,
        netPaid: bRecv,
        balance: bBal,
        label: 'Total'
      };
    }

    const catData = categoryBreakdown[resolvedCategory];
    if (catData) {
      return {
        gross: Number(catData.gross || catData.billed || 0),
        discount: Number(catData.discount || 0),
        gst: Number(catData.gst || 0),
        netBilled: Number(catData.billed || 0),
        collected: Number(catData.received || 0),
        netPaid: Number(catData.received || 0),
        balance: Number(catData.due || 0),
        label: catData.name
      };
    }

    const bFinal = Number(bill.finalAmount || 0);
    const bRecv = Number(bill.receivedAmount || 0);
    const bBal = (bill.totalBalance !== undefined && bill.totalBalance !== null && (bRecv > 0 || bill.totalBalance > 0))
      ? Number(bill.totalBalance)
      : Math.max(0, bFinal - bRecv);

    return {
      gross: Number(bill.totalBilledAmount ?? bFinal),
      discount: Number(bill.totalDiscount || 0),
      gst: Number(bill.totalTax || 0),
      netBilled: bFinal,
      collected: bRecv,
      netPaid: bRecv,
      balance: bBal,
      label: 'Total'
    };
  }, [bill, resolvedCategory, categoryBreakdown]);

  const selectedMaxDue = useMemo(() => {
    return currentSummary.balance;
  }, [currentSummary]);

  // Pre-fill payment amount when bill loads or category changes
  useEffect(() => {
    if (!bill) return;
    setPayAmount(currentSummary.balance > 0 ? currentSummary.balance.toFixed(0) : '');
  }, [bill, currentSummary.balance, resolvedCategory]);

  const handleAddDeposit = async () => {
    if (!bill) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) return alert('Enter valid amount');
    if (selectedMaxDue > 0 && amt > selectedMaxDue) {
      return alert(`Cannot collect more than ${resolvedCategory === 'ALL' ? 'total balance' : resolvedCategory + ' due'} (₹${selectedMaxDue.toFixed(2)})`);
    }

    try {
      setSaving(true);
      if (bill.isConsolidated) {
        if (resolvedCategory === 'ALL') {
          // Pay across all bills for this visit
          const billIds = bill.relatedBills.map(b => b._id);
          await frontdeskService.mergeAndPayBills({
            billIds,
            paymentAmount: amt,
            paymentMode: payMode
          });
        } else {
          // Pay target bill for selected category
          const normCat = resolvedCategory.toLowerCase();
          const targetBill = bill.relatedBills.find(b => {
            if (normCat === 'lab') return b.isLabOrder || b.tests || (b.items || []).some(it => it.serviceType === 'Lab');
            if (normCat === 'day care' || normCat === 'daycare') return b.dayCare || b.sourceType === 'DayCare' || (b.items || []).some(it => it.serviceType === 'Day Care');
            if (normCat === 'home care' || normCat === 'homecare') return b.homeCare || b.sourceType === 'HomeCare' || (b.items || []).some(it => it.serviceType === 'Home Care');
            if (normCat === 'consultation') return !b.isLabOrder && !b.tests && b.sourceType !== 'DayCare' && b.sourceType !== 'HomeCare';
            return false;
          }) || bill.relatedBills[0];

          await frontdeskService.payBill(targetBill._id, {
            amount: amt,
            paymentMode: payMode,
            purpose: `${resolvedCategory} fee`,
            serviceType: resolvedCategory
          });
        }
      } else {
        await frontdeskService.payBill(bill._id, {
          amount: amt,
          paymentMode: payMode,
          purpose: resolvedCategory === 'ALL' ? 'Payment' : `${resolvedCategory} fee`,
          serviceType: resolvedCategory === 'ALL' ? '' : resolvedCategory
        });
      }

      setPayAmount('');
      await fetchBill();
      if (onUpdate) onUpdate();
      onClose(); // Close modal after successful payment
    } catch (err) {
      console.error('Error adding payment', err);
      alert('Error adding payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      setSaving(true);
      const targetBillId = payment.billId || bill._id;
      await frontdeskService.deletePayment(targetBillId, payment._id);
      await fetchBill();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting payment', err);
      alert('Error deleting payment');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDiscount = async () => {
    if (!bill) return;
    const disc = parseFloat(discountVal) || 0;
    try {
      setSaving(true);
      if (bill.isConsolidated) {
        await frontdeskService.mergeAndPayBills({
          billIds: bill.relatedBills.map(b => b._id),
          globalDiscount: disc,
          paymentAmount: 0,
          paymentMode: 'CASH'
        });
      } else {
        await frontdeskService.updateBill(bill._id, {
          items: bill.items,
          discountType: 'flat',
          discountValue: disc
        });
      }
      await fetchBill();
      if (onUpdate) onUpdate();
      onClose();
      alert('Discount updated successfully');
    } catch (err) {
      alert('Error updating discount');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRefund = async () => {
    if (!bill) return;
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) return alert('Enter valid amount');
    try {
      setSaving(true);
      const targetId = bill.isConsolidated ? bill.relatedBills[0]._id : bill._id;
      await frontdeskService.payBill(targetId, { amount: -Math.abs(amt), paymentMode: refundMode, purpose: 'Refund' });
      setRefundAmount('');
      await fetchBill();
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      alert('Error processing refund');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailBill = async () => {
    const patient = appointment?.patient;
    let targetEmail = emailInput.trim();
    if (!targetEmail) {
      alert('Please enter an email address to send the bill.');
      return;
    }
    // Save updated email back to patient record
    if (patient?._id && targetEmail !== (patient?.email || '')) {
      try {
        await frontdeskService.updatePatient(patient._id, { email: targetEmail });
      } catch (err) { console.error('Could not save email', err); }
    }
    if (!bill) { alert('No bill found to send.'); return; }
    setEmailing(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';
      const rawLogoPath = clinicData?.logo || null;
      const clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;
      const clinicPhone = clinicData?.phone || '';
      const items = (bill.items || []).map((item) => ({
        name: item.serviceName,
        qty: item.qty || 1,
        price: `₹${parseFloat(item.unitPrice || 0).toFixed(2)}`,
        gst: `${item.gstPercent || 0}%`,
        discount: `-₹${parseFloat(item.discount || 0).toFixed(2)}`,
        total: `₹${parseFloat(item.totalPrice || 0).toFixed(2)}`
      }));

      const summary = [
        { label: 'Gross Amount', value: `₹${parseFloat(bill.totalBilledAmount || 0).toFixed(2)}` },
        { label: 'Discount', value: `-₹${parseFloat(bill.totalDiscount || 0).toFixed(2)}`, color: '#64748b' },
        { label: 'Net Billed Amount', value: `₹${parseFloat(bill.finalAmount || 0).toFixed(2)}`, bold: true, divider: true },
        { label: 'Collected Amount', value: `₹${parseFloat(bill.receivedAmount || 0).toFixed(2)}`, color: '#059669', bold: true }
      ];

      const html = generateA5BillHTML({
        clinicName: clinicData?.name || localStorage.getItem('clinicName') || 'Clinic',
        clinicLogo,
        clinicPhone,
        patientName: patient?.name,
        patientId: patient?.patientId,
        patientDetails: `${patient?.gender || ''} ${patient?.age ? `· ${patient.age} yrs` : ''} | Ph: ${patient?.phone || ''}`,
        title: 'INVOICE',
        billNo: bill.billNo || 'N/A',
        billDate: new Date(bill.billDate || Date.now()).toLocaleDateString('en-IN'),
        status: (bill.totalBalance > 0) ? 'UNPAID' : 'PAID',
        columns: [
          { key: 'name', label: 'Service Description', align: 'left' },
          { key: 'qty', label: 'Qty', align: 'center', width: '40px' },
          { key: 'price', label: 'Rate', align: 'right', width: '70px' },
          { key: 'discount', label: 'Discount', align: 'right', width: '70px', color: '#dc2626' },
          { key: 'total', label: 'Total', align: 'right', width: '80px', bold: true }
        ],
        items,
        summary,
        payments: []
      });
      const subject = `Your Bill from ${clinicData?.name || localStorage.getItem('clinicName') || 'Clinic'}`;
      const body = `<p>Dear ${patient?.name || 'Patient'},</p><p>Please find attached your bill.</p>`;
      await sendDocumentAsEmail(html, targetEmail, subject, body, `Bill_${bill.billNo || 'N/A'}.pdf`);
      alert(`Email successfully sent to ${targetEmail}`);
    } catch (err) {
      console.error('Email error:', err);
      alert('Failed to send email. Ensure backend is configured properly.');
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="pm-overlay">
        <div className="pm-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="pm-overlay" onClick={onClose}>
        <div className="pm-content" onClick={e => e.stopPropagation()} style={{ padding: 30, textAlign: 'center' }}>
          <h4>No Bill Found</h4>
          <p className="text-muted">Generate a bill first to make payments.</p>
          <button className="btn btn-secondary mt-3" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const patient = appointment.patient;
  const currentTotalBal = (bill.totalBalance !== undefined && bill.totalBalance !== null && (bill.receivedAmount > 0 || bill.totalBalance > 0))
    ? Number(bill.totalBalance)
    : Math.max(0, Number(bill.finalAmount || 0) - Number(bill.receivedAmount || 0));

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pm-header">
          <div>
            <strong>{patient?.patientId} : {patient?.name}</strong>
          </div>
          <button onClick={onClose} className="pm-close"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="pm-body">
          {/* Top Section */}
          <div className="pm-top-section">
            <div className="pm-print-email">
              <div
                className="pm-print-btn"
                onClick={() => handlePrintBill(patient, appointment.billSummary, appointment, resolvedCategory)}
              >
                <Printer size={16} /> Print {resolvedCategory === 'ALL' ? 'bill' : `${resolvedCategory} bill`}
              </div>
              <div className="pm-email-input">
                <input
                  type="email"
                  placeholder="Patient Email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
                <button
                  onClick={handleEmailBill}
                  disabled={emailing}
                  title="Send bill to this email"
                >
                  {emailing ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <Mail size={16} />}
                </button>
              </div>
            </div>

            <div className="pm-summary">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bill Breakdown
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: resolvedCategory === 'ALL' ? '#eff6ff' : '#f0fdf4',
                  color: resolvedCategory === 'ALL' ? '#1d4ed8' : '#15803d',
                  border: `1px solid ${resolvedCategory === 'ALL' ? '#bfdbfe' : '#bbf7d0'}`
                }}>
                  {resolvedCategory === 'ALL' ? 'Total (All Services)' : resolvedCategory}
                </span>
              </div>
              <div className="pm-summary-row">
                <span>Gross Bill Amount</span>
                <span>{currentSummary.gross.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>Discount</span>
                <span>- {currentSummary.discount.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>GST</span>
                <span>{currentSummary.gst.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-bold">
                <span>Net Billed Amount</span>
                <span>{currentSummary.netBilled.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>Collected Amount</span>
                <span>{currentSummary.collected.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-bold">
                <span>Net Paid Amount</span>
                <span>{currentSummary.netPaid.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-balance">
                <span>Balance Amount</span>
                <span style={{ color: currentSummary.balance > 0 ? '#dc2626' : '#059669' }}>
                  {currentSummary.balance.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pm-tabs">
            <div className={`pm-tab ${activeTab === 'Payment' ? 'active' : ''}`} onClick={() => setActiveTab('Payment')}>Payment</div>
            <div className={`pm-tab ${activeTab === 'Edit Discount' ? 'active' : ''}`} onClick={() => setActiveTab('Edit Discount')}>Edit Discount</div>
            <div className={`pm-tab ${activeTab === 'Refund' ? 'active' : ''}`} onClick={() => setActiveTab('Refund')}>Refund</div>
          </div>

          {/* Tab Content */}
          <div className="pm-tab-content">
            {activeTab === 'Payment' && (
              <div className="pm-payment-tab">
                <div className="pm-inputs-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                  <div className="pm-input-group" style={{ minWidth: 160 }}>
                    <label>Service / Dept</label>
                    <select
                      value={resolvedCategory}
                      onChange={e => {
                        const newCat = e.target.value;
                        setPayCategory(newCat);
                      }}
                    >
                      <option value="ALL">All (Due: ₹{currentTotalBal.toFixed(0)})</option>
                      {Object.values(categoryBreakdown).map(cat => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name} (Due: ₹{cat.due.toFixed(0)}{cat.due <= 0 ? ' - PAID' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pm-input-group">
                    <label>Payment mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)}>
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                    </select>
                  </div>
                  <div className="pm-input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                      <label style={{ margin: 0 }}>Amount</label>
                      <span>Max: ₹{selectedMaxDue.toFixed(0)}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={selectedMaxDue > 0 ? selectedMaxDue : undefined}
                      value={payAmount}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') { setPayAmount(''); return; }
                        const num = parseFloat(val);
                        if (!isNaN(num) && selectedMaxDue > 0 && num > selectedMaxDue) {
                          setPayAmount(selectedMaxDue.toString());
                        } else {
                          setPayAmount(val);
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <button className="pm-action-btn" onClick={handleAddDeposit} disabled={saving || selectedMaxDue <= 0}>
                    {saving ? 'SAVING...' : 'ADD DEPOSIT'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Edit Discount' && (
              <div className="pm-discount-tab">
                <div className="pm-inputs-row" style={{ justifyContent: 'center' }}>
                  <div className="pm-input-group" style={{ width: 150 }}>
                    <label>Discount</label>
                    <input
                      type="number"
                      value={discountVal}
                      onChange={e => setDiscountVal(e.target.value)}
                      style={{ backgroundColor: '#fcd3d3' }}
                    />
                  </div>
                  <button className="pm-action-btn pm-btn-danger" onClick={handleEditDiscount} disabled={saving} style={{ marginTop: 22 }}>
                    {saving ? 'SAVING...' : 'EDIT DISCOUNT'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Refund' && (
              <div className="pm-refund-tab">
                <div style={{ fontSize: '0.85rem', marginBottom: 10, textAlign: 'center' }}>Give Refund & add To Discount</div>
                <div className="pm-inputs-row" style={{ justifyContent: 'center' }}>
                  <div className="pm-input-group">
                    <label>Refund mode</label>
                    <select value={refundMode} onChange={e => setRefundMode(e.target.value)} style={{ backgroundColor: '#fcd3d3' }}>
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                    </select>
                  </div>
                  <div className="pm-input-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      style={{ backgroundColor: '#fcd3d3' }}
                    />
                  </div>
                  <button className="pm-action-btn pm-btn-danger" onClick={handleAddRefund} disabled={saving} style={{ marginTop: 22 }}>
                    {saving ? 'SAVING...' : 'ADD REFUND'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Payments Footer (Only in Payment Tab) */}
          {activeTab === 'Payment' && (
            <div className="pm-footer">
              <div className="pm-footer-title">Recent few payments :</div>
              {(!bill.payments || bill.payments.length === 0) ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No payments found.</div>
              ) : (
                <table className="pm-footer-table">
                  <tbody>
                    {bill.payments.slice().reverse().slice(0, 5).map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(p.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span>{p.purpose?.toUpperCase() || 'APPOINTMENT'}</span>
                          {p.serviceType && (
                            <span style={{ marginLeft: 6, fontSize: '0.7rem', padding: '1px 5px', borderRadius: 4, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                              {p.serviceType}
                            </span>
                          )}
                        </td>
                        <td style={{ color: p.amount < 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          ₹{p.amount < 0 ? p.amount : p.amount}
                        </td>
                        <td>{p.paymentMode}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            title="Delete Payment"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pm-overlay {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.15s ease-in-out;
        }
        .pm-content {
          background: #fff; border-radius: 4px;
          width: 90%; max-width: 600px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          overflow: hidden;
          animation: slideDown 0.2s ease-out;
          font-family: Arial, sans-serif;
        }
        .pm-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 20px; font-size: 1.1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .pm-close {
          background: none; border: none; cursor: pointer; color: #000;
        }
        .pm-body {
          display: flex; flex-direction: column;
        }
        .pm-top-section {
          display: flex; justify-content: space-between;
          padding: 20px;
        }
        .pm-print-email {
          width: 45%;
        }
        .pm-print-btn {
          color: #2563eb; font-size: 0.9rem; cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          margin-bottom: 20px;
        }
        .pm-email-input {
          display: flex; align-items: stretch; border: 1px solid #cbd5e1; border-radius: 3px;
        }
        .pm-email-input input {
          border: none; padding: 6px 10px; font-size: 0.85rem; width: 100%; outline: none;
        }
        .pm-email-input button {
          border: none; background: #e2e8f0; border-left: 1px solid #cbd5e1;
          padding: 0 10px; cursor: pointer; color: #0f172a;
        }
        .pm-summary {
          width: 50%;
        }
        .pm-summary-row {
          display: flex; justify-content: space-between;
          font-size: 0.85rem; margin-bottom: 6px; color: #1e293b;
        }
        .pm-bold { font-weight: bold; }
        .pm-balance {
          font-weight: bold; font-size: 1.05rem; margin-top: 10px;
        }
        .pm-tabs {
          display: flex; border-bottom: 1px solid #cbd5e1; padding: 0 20px;
        }
        .pm-tab {
          padding: 10px 15px; font-size: 0.85rem; cursor: pointer; color: #475569;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
        }
        .pm-tab.active {
          border-bottom: 2px solid #2563eb; color: #1e293b;
        }
        .pm-tab-content {
          padding: 30px 20px; background: #f8fafc; min-height: 120px;
        }
        .pm-inputs-row {
          display: flex; gap: 15px; align-items: flex-end;
        }
        .pm-input-group {
          display: flex; flex-direction: column;
        }
        .pm-input-group label {
          font-size: 0.8rem; margin-bottom: 4px; color: #1e293b;
        }
        .pm-input-group select, .pm-input-group input {
          border: 1px solid #cbd5e1; border-radius: 3px; padding: 8px 10px;
          font-size: 0.85rem; outline: none; background: #fff;
        }
        .pm-action-btn {
          background: #2563eb; color: #fff; border: none; border-radius: 3px;
          padding: 9px 20px; font-size: 0.8rem; font-weight: bold; cursor: pointer;
        }
        .pm-action-btn:hover { background: #1d4ed8; }
        .pm-btn-danger { background: #ef4444; }
        .pm-btn-danger:hover { background: #dc2626; }
        .pm-footer {
          background: #e2e8f0; padding: 10px 20px; border-top: 1px solid #cbd5e1;
        }
        .pm-footer-title {
          font-size: 0.8rem; color: #64748b; margin-bottom: 8px;
        }
        .pm-footer-table {
          width: 100%; font-size: 0.8rem; color: #1e293b; border-collapse: collapse;
        }
        .pm-footer-table td { padding: 4px 0; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PaymentModal;
