import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import clinicService from '../../../services/clinicService';
import { Printer, Receipt, CreditCard, AlertCircle, CheckCircle, Mail, Loader2, Trash2 } from 'lucide-react';
import { sendDocumentAsEmail } from '../../../services/emailService';
import useWebSocket from '../../../hooks/useWebSocket';

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';
import MergeBillModal from '../../MergeBillModal';
import { generateA5BillHTML, getCategoryForItem, getInvoiceTitle } from '../../../utils/printA5Bill';
import PrintBillModal from './PrintBillModal';

const generateBillHTML = (bill, patient, clinicData, category = 'ALL') => {
  const rawLogoPath = clinicData?.logo || null;
  const clinicLogo = rawLogoPath
    ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}`
    : null;
  const clinicPhone = clinicData?.phone || localStorage.getItem('clinicPhone') || '9002535240';
  const clinicName = clinicData?.name || localStorage.getItem('clinicName') || 'Clinic';

  const isCategoryFilter = category && category !== 'ALL';
  const targetCategory = isCategoryFilter ? category.trim() : null;

  const allItems = bill.items || [];
  const itemsToPrint = isCategoryFilter
    ? allItems.filter(item => getCategoryForItem(item).toLowerCase() === targetCategory.toLowerCase())
    : allItems;

  const items = itemsToPrint.map((item, i) => ({
    sn: i + 1,
    name: item.serviceName,
    qty: item.qty,
    price: `₹${parseFloat(item.unitPrice).toFixed(2)}`,
    gst: `${item.gstPercent || 0}%`,
    discount: `-₹${parseFloat(item.discount || 0).toFixed(2)}`,
    total: `₹${parseFloat(item.totalPrice || 0).toFixed(2)}`
  }));

  let billedAmt = 0;
  let discountAmt = 0;
  let gstAmt = 0;
  let finalAmt = 0;
  let receivedAmt = 0;
  let balanceAmt = 0;

  if (!isCategoryFilter) {
    billedAmt = parseFloat(bill.totalBilledAmount || 0);
    discountAmt = parseFloat(bill.totalDiscount || 0);
    gstAmt = parseFloat(bill.totalTax || 0);
    finalAmt = parseFloat(bill.finalAmount || 0);
    receivedAmt = parseFloat(bill.receivedAmount || 0);
    balanceAmt = parseFloat(bill.totalBalance || 0);
  } else {
    billedAmt = itemsToPrint.reduce((acc, it) => acc + (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))), 0);
    discountAmt = itemsToPrint.reduce((acc, it) => acc + parseFloat(it.discount || 0), 0);
    gstAmt = itemsToPrint.reduce((acc, it) => {
      const lp = (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))) - parseFloat(it.discount || 0);
      return acc + (lp * (parseFloat(it.gstPercent || 0) / 100));
    }, 0);
    finalAmt = itemsToPrint.reduce((acc, it) => acc + parseFloat(it.totalPrice || 0), 0);

    if (bill.totalBalance <= 0 || (bill.finalAmount > 0 && bill.receivedAmount >= bill.finalAmount)) {
      receivedAmt = finalAmt;
      balanceAmt = 0;
    } else {
      let specificReceived = 0;
      (bill.payments || []).forEach(p => {
        const pSvc = (p.serviceType || '').trim().toLowerCase();
        const pPurp = (p.purpose || '').trim().toLowerCase();
        const normCat = targetCategory.toLowerCase();
        if (
          pSvc === normCat ||
          pPurp.includes(normCat) ||
          (normCat === 'consultation' && pPurp.includes('consult')) ||
          (normCat === 'day care' && (pPurp.includes('day care') || pPurp.includes('daycare'))) ||
          (normCat === 'home care' && (pPurp.includes('home care') || pPurp.includes('homecare'))) ||
          (normCat === 'lab' && (pPurp.includes('lab') || pPurp.includes('test'))) ||
          (normCat === 'other' && (pSvc === 'other' || pPurp.includes('other')))
        ) {
          specificReceived += parseFloat(p.amount || 0);
        }
      });
      receivedAmt = Math.min(finalAmt, specificReceived);
      balanceAmt = Math.max(0, parseFloat((finalAmt - receivedAmt).toFixed(2)));
    }
  }

  let title = getInvoiceTitle(category);

  const payments = (bill.payments || [])
    .filter(p => {
      if (!isCategoryFilter) return true;
      const pSvc = (p.serviceType || '').trim().toLowerCase();
      const pPurp = (p.purpose || '').trim().toLowerCase();
      const normCat = targetCategory.toLowerCase();
      return (
        pSvc === normCat ||
        pPurp.includes(normCat) ||
        (normCat === 'consultation' && pPurp.includes('consult')) ||
        (normCat === 'day care' && (pPurp.includes('day care') || pPurp.includes('daycare'))) ||
        (normCat === 'home care' && (pPurp.includes('home care') || pPurp.includes('homecare'))) ||
        (normCat === 'lab' && (pPurp.includes('lab') || pPurp.includes('test'))) ||
        (normCat === 'other' && (pSvc === 'other' || pPurp.includes('other')))
      );
    })
    .map(p => ({
      date: new Date(p.paidAt).toLocaleDateString('en-IN'),
      mode: p.paymentMode,
      amount: `₹${parseFloat(p.amount).toFixed(2)}`
    }));

  const summary = [
    { label: isCategoryFilter ? `${targetCategory} Billed` : 'Total Billed', value: `₹${billedAmt.toFixed(2)}` },
    ...(discountAmt > 0 ? [{ label: 'Discount', value: `-₹${discountAmt.toFixed(2)}`, color: '#dc2626' }] : []),
    ...(gstAmt > 0 ? [{ label: 'GST', value: `+₹${gstAmt.toFixed(2)}` }] : []),
    { label: isCategoryFilter ? `${targetCategory} Total` : 'Final Amount', value: `₹${finalAmt.toFixed(2)}`, bold: true, divider: true, color: '#1d4ed8' },
    { label: 'Amount Received', value: `₹${receivedAmt.toFixed(2)}`, color: '#059669' },
    { label: 'Balance Due', value: `₹${balanceAmt.toFixed(2)}`, bold: true, divider: true, color: balanceAmt > 0 ? '#dc2626' : '#059669' }
  ];

  return generateA5BillHTML({
    clinicName,
    clinicLogo,
    clinicPhone,
    patientName: patient?.name,
    patientId: patient?.patientId,
    patientDetails: `${patient?.gender || ''} ${patient?.age ? `· ${patient.age} yrs` : ''} | Ph: ${patient?.phone || ''}`,
    title,
    billNo: bill.billNo || 'N/A',
    billDate: new Date(bill.billDate || Date.now()).toLocaleDateString('en-IN'),
    status: balanceAmt > 0 ? 'UNPAID' : 'FULLY PAID',
    columns: [
      { key: 'sn', label: '#', width: '30px', align: 'center' },
      { key: 'name', label: 'Service Description', align: 'left' },
      { key: 'qty', label: 'Qty', align: 'center', width: '40px' },
      { key: 'price', label: 'Price', align: 'right', width: '70px' },
      { key: 'gst', label: 'GST', align: 'center', width: '50px' },
      { key: 'discount', label: 'Disc.', align: 'right', width: '60px', color: '#dc2626' },
      { key: 'total', label: 'Total', align: 'right', width: '80px', bold: true }
    ],
    items,
    payments,
    summary
  });
};

const printBill = (bill, patient, clinicData, category = 'ALL') => {
  const html = generateBillHTML(bill, patient, clinicData, category);
  let iframe = document.getElementById('bills-tab-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'bills-tab-print-frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(iframe);
  }
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); };
  setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { } }, 700);
};

const BillsTab = ({ patient }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(null);
  const [clinicData, setClinicData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [billForPrintModal, setBillForPrintModal] = useState(null);

  const handlePrintBill = (bill) => {
    const validItems = (bill.items || []).filter(i => i.serviceName);
    const distinctCats = Array.from(new Set(validItems.map(i => getCategoryForItem(i)).filter(Boolean)));
    if (distinctCats.length > 1) {
      setBillForPrintModal(bill);
    } else {
      printBill(bill, patient, clinicData, 'ALL');
    }
  };

  useWebSocket({
    BILL_CREATED: () => setRefreshTrigger(prev => prev + 1),
    BILL_UPDATED: () => setRefreshTrigger(prev => prev + 1),
    MERGED_BILL_PAYMENT: () => setRefreshTrigger(prev => prev + 1),
    LAB_ORDER_UPDATED: () => setRefreshTrigger(prev => prev + 1),
    DAYCARE_UPDATED: () => setRefreshTrigger(prev => prev + 1),
    HOMECARE_UPDATED: () => setRefreshTrigger(prev => prev + 1),
  });

  useEffect(() => {
    // Fetch bills
    frontdeskService.getBills({ patientId: patient.patientId })
      .then(data => { setBills(data || []); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch clinic data for printing/emailing logo & phone
    clinicService.getAllClinics().then(allClinics => {
      const storedClinicName = localStorage.getItem('clinicName') || '';
      const storedClinicId = localStorage.getItem('clinicId') || '';
      const matched = allClinics.find(c =>
        c._id === storedClinicId ||
        c.name?.toLowerCase() === storedClinicName?.toLowerCase()
      ) || allClinics[0] || null;
      setClinicData(matched);
    }).catch(console.error);
  }, [patient, refreshTrigger]);

  const emailBill = async (bill) => {
    let targetEmail = patient?.email;
    if (!targetEmail) {
      targetEmail = window.prompt("Patient does not have a registered email address. Please enter an email address to send the bill:");
      if (!targetEmail) return;
      try {
        if (patient?._id) {
          await frontdeskService.updatePatient(patient._id, { email: targetEmail });
        }
      } catch (err) { console.error("Could not save email", err); }
    } else {
      const newEmail = window.prompt("Confirm or change the email address to send the bill:", targetEmail);
      if (!newEmail) return;
      if (newEmail !== targetEmail) {
        targetEmail = newEmail;
        try {
          if (patient?._id) {
            await frontdeskService.updatePatient(patient._id, { email: targetEmail });
          }
        } catch (err) { console.error("Could not save email", err); }
      }
    }

    setEmailing(bill._id);
    try {
      const html = generateBillHTML(bill, patient, clinicData);
      const subject = `Your Bill #${bill.billNo || 'N/A'} from ${clinicData?.name || localStorage.getItem('clinicName') || 'Clinic'}`;
      const body = `<p>Dear ${patient?.name || 'Patient'},</p><p>Please find attached your bill.</p>`;

      await sendDocumentAsEmail(html, targetEmail, subject, body, `Bill_${bill.billNo || 'N/A'}.pdf`);
      alert(`Email successfully sent to ${targetEmail}`);
    } catch (err) {
      alert('Failed to send email. Ensure backend is configured properly.');
    } finally {
      setEmailing(null);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this bill? All associated payments will also be lost!')) return;
    try {
      await frontdeskService.deleteBill(billId);
      alert('Bill deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error(e);
      alert('Failed to delete bill');
    }
  };

  const totalFinal = bills.reduce((s, b) => s + (b.finalAmount || 0), 0);
  const totalReceived = bills.reduce((s, b) => s + (b.receivedAmount || 0), 0);
  const totalBalance = bills.reduce((s, b) => s + (b.totalBalance || 0), 0);

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f8fafc' }}>

      {/* Summary cards & Actions */}
      <div className="d-flex justify-content-between align-items-center p-3 pb-0 flex-wrap">
        <div className="d-flex gap-3 flex-wrap">
          {[
            { label: 'Total Billed', value: totalFinal, color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Total Received', value: totalReceived, color: '#059669', bg: '#f0fdf4' },
            { label: 'Balance Due', value: totalBalance, color: totalBalance > 0 ? '#dc2626' : '#059669', bg: totalBalance > 0 ? '#fef2f2' : '#f0fdf4' },
          ].map(c => (
            <div key={c.label} className="rounded-3 px-3 py-2 d-flex flex-column" style={{ backgroundColor: c.bg, minWidth: 140 }}>
              <span className="text-secondary" style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</span>
              <span className="fw-black" style={{ fontSize: '1.1rem', color: c.color }}>₹ {parseFloat(c.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div>
          <button
            className="btn btn-sm btn-primary rounded-pill fw-bold shadow-sm px-4 py-2 mt-2 mt-md-0"
            onClick={() => setShowMergeModal(true)}>
            All Bills (Merge & Pay)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-grow-1 overflow-auto p-3">
        {loading ? (
          <div className="text-center mt-5 text-secondary">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-secondary">
            <Receipt size={40} style={{ opacity: 0.3 }} />
            <div className="fw-semibold">No bills found for this patient</div>
            <div className="small">Go to "Add Bills" tab to create a bill</div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {bills.map(bill => {
              const isPaid = bill.totalBalance <= 0;
              return (
                <div key={bill._id} className="bg-white rounded-3 shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                  {/* Bill header */}
                  <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: 34, height: 34, backgroundColor: '#eff6ff' }}>
                        <Receipt size={16} style={{ color: '#2563eb' }} />
                      </div>
                      <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                          Bill {bill.billNo ? `#${bill.billNo}` : 'N/A'} — {new Date(bill.billDate || bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.72rem' }}>{bill.items?.length || 0} service(s)</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: isPaid ? '#d1fae5' : '#fee2e2', color: isPaid ? '#065f46' : '#dc2626', fontWeight: 700, fontSize: '0.72rem' }}>
                        {isPaid ? '✓ PAID' : `DUE ₹${parseFloat(bill.totalBalance).toFixed(2)}`}
                      </span>
                      <button className="btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                        style={{ border: '1.5px solid #2563eb', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.75rem' }}
                        onClick={() => handlePrintBill(bill)} disabled={emailing === bill._id}>
                        <Printer size={12} /> Print
                      </button>
                      <button className="btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                        style={{ border: '1.5px solid #2563eb', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.75rem' }}
                        onClick={() => emailBill(bill)} disabled={emailing === bill._id}>
                        {emailing === bill._id ? <Loader2 size={12} className="spin" /> : <Mail size={12} />} Email
                      </button>
                      <button className="btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                        style={{ border: '1.5px solid #ef4444', color: '#ef4444', backgroundColor: '#fef2f2', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteBill(bill._id)} title="Delete Bill">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="table-responsive">
                    <table className="table table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th className="text-secondary fw-semibold" style={{ fontSize: '0.68rem', textTransform: 'uppercase', paddingLeft: 24 }}>#</th>
                          <th className="text-secondary fw-semibold" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>Service</th>
                          <th className="text-secondary fw-semibold text-center" style={{ fontSize: '0.68rem', textTransform: 'uppercase', width: 50 }}>Qty</th>
                          <th className="text-secondary fw-semibold text-end" style={{ fontSize: '0.68rem', textTransform: 'uppercase', width: 100 }}>Unit Price</th>
                          <th className="text-secondary fw-semibold text-center" style={{ fontSize: '0.68rem', textTransform: 'uppercase', width: 60 }}>GST%</th>
                          <th className="text-secondary fw-semibold text-end" style={{ fontSize: '0.68rem', textTransform: 'uppercase', width: 100 }}>Discount</th>
                          <th className="text-secondary fw-semibold text-end" style={{ fontSize: '0.68rem', textTransform: 'uppercase', width: 100, paddingRight: 24 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(bill.items || []).map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ paddingLeft: 24 }} className="text-secondary">{i + 1}</td>
                            <td className="fw-semibold text-dark">{item.serviceName}</td>
                            <td className="text-center">{item.qty}</td>
                            <td className="text-end">₹{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="text-center">{item.gstPercent || 0}%</td>
                            <td className="text-end text-danger">-₹{parseFloat(item.discount || 0).toFixed(2)}</td>
                            <td className="text-end fw-bold" style={{ color: '#1d4ed8', paddingRight: 24 }}>₹{parseFloat(item.totalPrice || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals + Payments */}
                  <div className="d-flex align-items-start justify-content-between px-4 py-3" style={{ backgroundColor: '#fafafa', borderTop: '1px solid #f1f5f9', gap: 20 }}>
                    {/* Payment history */}
                    <div className="flex-grow-1">
                      {bill.payments?.length > 0 && (
                        <>
                          <div className="small fw-semibold text-secondary mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Payments</div>
                          <div className="d-flex flex-column gap-1">
                            {bill.payments.map((p, i) => (
                              <div key={i} className="d-flex align-items-center gap-2" style={{ fontSize: '0.78rem' }}>
                                <CheckCircle size={12} style={{ color: '#059669', flexShrink: 0 }} />
                                <span className="fw-semibold text-success">₹{parseFloat(p.amount).toFixed(2)}</span>
                                <span className="text-secondary">via {p.paymentMode}</span>
                                {p.purpose && <span className="text-muted">· {p.purpose}</span>}
                                <span className="text-muted ms-auto" style={{ fontSize: '0.7rem' }}>{new Date(p.paidAt).toLocaleDateString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {!bill.payments?.length && <div className="text-muted small">No payments recorded</div>}
                    </div>

                    {/* Summary */}
                    <div style={{ minWidth: 200 }}>
                      {[
                        { label: 'Total Billed', value: bill.totalBilledAmount, color: '#1e293b' },
                        { label: 'Discount', value: bill.totalDiscount, prefix: '-', color: '#dc2626' },
                        { label: 'GST', value: bill.totalTax, prefix: '+', color: '#059669' },
                      ].map(r => (
                        <div key={r.label} className="d-flex justify-content-between" style={{ fontSize: '0.78rem', marginBottom: 4 }}>
                          <span className="text-secondary">{r.label}</span>
                          <span className="fw-semibold" style={{ color: r.color }}>{r.prefix || ''}₹{parseFloat(r.value || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between pt-2" style={{ borderTop: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 800 }}>
                        <span>Final</span>
                        <span style={{ color: '#1d4ed8' }}>₹{parseFloat(bill.finalAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                        <span>Received</span><span>₹{parseFloat(bill.receivedAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between rounded-2 px-2 py-1 mt-1" style={{ backgroundColor: isPaid ? '#f0fdf4' : '#fef2f2', fontSize: '0.82rem', fontWeight: 800 }}>
                        <span style={{ color: isPaid ? '#059669' : '#dc2626' }}>Balance</span>
                        <span style={{ color: isPaid ? '#059669' : '#dc2626' }}>₹{parseFloat(bill.totalBalance || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MergeBillModal
        show={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        patientId={patient.patientId}
        patientName={patient.name}
      />

      <PrintBillModal
        show={Boolean(billForPrintModal)}
        onClose={() => setBillForPrintModal(null)}
        onPrint={(cat) => {
          if (billForPrintModal) {
            printBill(billForPrintModal, patient, clinicData, cat);
          }
        }}
        patient={patient}
        bill={billForPrintModal}
      />
    </div>
  );
};

export default BillsTab;
