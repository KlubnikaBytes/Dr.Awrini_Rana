import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import clinicService from '../../../services/clinicService';
import { Printer, Receipt, CreditCard, AlertCircle, CheckCircle, Mail, Loader2 } from 'lucide-react';
import { sendDocumentAsEmail } from '../../../services/emailService';

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';

const generateBillHTML = (bill, patient, clinicData) => {
  const rawLogoPath = clinicData?.logo || null;
  const clinicLogo = rawLogoPath
    ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}`
    : null;
  const clinicPhone = clinicData?.phone || '9002535240';
  const rows = (bill.items || []).map((item, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${i+1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.serviceName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${parseFloat(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.gstPercent||0}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-₹${parseFloat(item.discount||0).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1d4ed8">₹${parseFloat(item.totalPrice||0).toFixed(2)}</td>
    </tr>`).join('');

  const paymentsRows = (bill.payments || []).map((p,i) => `
    <tr>
      <td style="padding:6px 12px;font-size:12px">${i+1}. ${new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
      <td style="padding:6px 12px;font-size:12px">${p.paymentMode}</td>
      <td style="padding:6px 12px;font-size:12px">${p.purpose||'Payment'}</td>
      <td style="padding:6px 12px;font-size:12px;font-weight:700;color:#059669">₹${parseFloat(p.amount).toFixed(2)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><title>Invoice - ${patient?.name}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}
    table{width:100%;border-collapse:collapse}
    th{background:#f8fafc;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:0.4px}
    @media print{body{padding:16px}}
  </style></head><body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2563eb">
    <div style="display:flex; gap:16px; align-items:center;">
      ${clinicLogo ? `<img src="${clinicLogo}" alt="Clinic Logo" style="max-height:65px; max-width:180px; object-fit:contain;" />` : ''}
      <div>
        <h2 style="margin:0;color:#1d4ed8;font-size:20px">${clinicData?.name || localStorage.getItem('clinicName') || 'mediplix'}</h2>
        <p style="margin:4px 0 0;color:#64748b;font-size:12px">Medical Invoice / Receipt</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:12px;font-weight:600">&#128222; ${clinicPhone}</p>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:900;color:#2563eb">INVOICE</div>
      <div style="color:#64748b;font-size:12px;margin-top:4px">Date: ${new Date(bill.billDate||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
      <div style="color:#64748b;font-size:11px">Status: <b style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">${bill.totalBalance>0?'UNPAID':'PAID'}</b></div>
    </div>
  </div>

  <!-- Patient Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div style="background:#f8fafc;padding:12px;border-radius:8px">
      <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:6px">Bill To</div>
      <div style="font-weight:700;font-size:15px">${patient?.name||'—'}</div>
      <div style="color:#64748b;margin-top:2px">${patient?.gender||''} · ${patient?.age||''} yrs</div>
      <div style="color:#64748b">${patient?.phone||''}</div>
      <div style="color:#64748b">Patient ID: ${patient?.patientId||''}</div>
    </div>
    <div style="background:#f8fafc;padding:12px;border-radius:8px">
      <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:6px">Amount Summary</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total Billed</span><span>₹${parseFloat(bill.totalBilledAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#dc2626"><span>Discount</span><span>-₹${parseFloat(bill.totalDiscount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#059669"><span>GST</span><span>+₹${parseFloat(bill.totalTax||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;padding-top:6px;border-top:1px solid #e2e8f0"><span>Final</span><span style="color:#1d4ed8">₹${parseFloat(bill.finalAmount||0).toFixed(2)}</span></div>
    </div>
  </div>

  <!-- Items Table -->
  <table style="margin-bottom:20px">
    <thead><tr><th>#</th><th>Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  ${bill.payments?.length > 0 ? `
  <!-- Payments -->
  <div style="margin-bottom:20px">
    <div style="font-weight:700;margin-bottom:8px;font-size:12px;text-transform:uppercase;color:#64748b">Payment History</div>
    <table><thead><tr><th>Date</th><th>Mode</th><th>Purpose</th><th>Amount</th></tr></thead>
    <tbody>${paymentsRows}</tbody></table>
    <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-top:8px;font-weight:700">
      <span style="color:#059669">Total Received</span><span style="color:#059669">₹${parseFloat(bill.receivedAmount||0).toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 12px;background:${bill.totalBalance>0?'#fef2f2':'#f0fdf4'};border-radius:6px;margin-top:4px;font-weight:700;font-size:14px">
      <span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">Balance Due</span>
      <span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">₹${parseFloat(bill.totalBalance||0).toFixed(2)}</span>
    </div>
  </div>` : ''}

  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
    Thank you for choosing mediplix · Computer-generated invoice
    <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
  </div>
  </body></html>`;
};

const printBill = (bill, patient, clinicData) => {
  const html = generateBillHTML(bill, patient, clinicData);
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
  setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e){} }, 700);
};

const BillsTab = ({ patient }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(null);
  const [clinicData, setClinicData] = useState(null);

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
  }, [patient]);

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
      const subject = `Your Bill #${bill.billNo || bill._id?.slice(-6).toUpperCase() || 'N/A'} from ${clinicData?.name || localStorage.getItem('clinicName') || 'Clinic'}`;
      const body = `<p>Dear ${patient?.name || 'Patient'},</p><p>Please find attached your bill.</p>`;
      
      await sendDocumentAsEmail(html, targetEmail, subject, body, `Bill_${bill.billNo || bill._id?.slice(-6).toUpperCase()}.pdf`);
      alert(`Email successfully sent to ${targetEmail}`);
    } catch (err) {
      alert('Failed to send email. Ensure backend is configured properly.');
    } finally {
      setEmailing(null);
    }
  };

  const totalFinal    = bills.reduce((s, b) => s + (b.finalAmount||0), 0);
  const totalReceived = bills.reduce((s, b) => s + (b.receivedAmount||0), 0);
  const totalBalance  = bills.reduce((s, b) => s + (b.totalBalance||0), 0);

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f8fafc' }}>

      {/* Summary cards */}
      <div className="d-flex gap-3 p-3 pb-0 flex-wrap">
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

      {/* Table */}
      <div className="flex-grow-1 overflow-auto p-3">
        {loading ? (
          <div className="text-center mt-5 text-secondary">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-secondary">
            <Receipt size={40} style={{ opacity: 0.3 }}/>
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
                        <Receipt size={16} style={{ color: '#2563eb' }}/>
                      </div>
                      <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                          Bill #{bill.billNo || bill._id?.slice(-6).toUpperCase() || 'N/A'} — {new Date(bill.billDate||bill.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
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
                        onClick={() => printBill(bill, patient, clinicData)} disabled={emailing === bill._id}>
                        <Printer size={12}/> Print
                      </button>
                      <button className="btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                        style={{ border: '1.5px solid #2563eb', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.75rem' }}
                        onClick={() => emailBill(bill)} disabled={emailing === bill._id}>
                        {emailing === bill._id ? <Loader2 size={12} className="spin" /> : <Mail size={12}/>} Email
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
                        {(bill.items||[]).map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ paddingLeft: 24 }} className="text-secondary">{i+1}</td>
                            <td className="fw-semibold text-dark">{item.serviceName}</td>
                            <td className="text-center">{item.qty}</td>
                            <td className="text-end">₹{parseFloat(item.unitPrice||0).toFixed(2)}</td>
                            <td className="text-center">{item.gstPercent||0}%</td>
                            <td className="text-end text-danger">-₹{parseFloat(item.discount||0).toFixed(2)}</td>
                            <td className="text-end fw-bold" style={{ color: '#1d4ed8', paddingRight: 24 }}>₹{parseFloat(item.totalPrice||0).toFixed(2)}</td>
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
                                <CheckCircle size={12} style={{ color: '#059669', flexShrink: 0 }}/>
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
                          <span className="fw-semibold" style={{ color: r.color }}>{r.prefix||''}₹{parseFloat(r.value||0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between pt-2" style={{ borderTop: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 800 }}>
                        <span>Final</span>
                        <span style={{ color: '#1d4ed8' }}>₹{parseFloat(bill.finalAmount||0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                        <span>Received</span><span>₹{parseFloat(bill.receivedAmount||0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between rounded-2 px-2 py-1 mt-1" style={{ backgroundColor: isPaid?'#f0fdf4':'#fef2f2', fontSize: '0.82rem', fontWeight: 800 }}>
                        <span style={{ color: isPaid?'#059669':'#dc2626' }}>Balance</span>
                        <span style={{ color: isPaid?'#059669':'#dc2626' }}>₹{parseFloat(bill.totalBalance||0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsTab;
