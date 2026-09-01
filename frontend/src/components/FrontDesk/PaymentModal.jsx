import React, { useState, useEffect } from 'react';
import { X, Printer, Mail } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import clinicService from '../../services/clinicService';
import { sendDocumentAsEmail } from '../../services/emailService';

const PaymentModal = ({ appointment, onClose, onUpdate, handlePrintBill }) => {
  const [activeTab, setActiveTab] = useState('Payment');
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
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
      const bills = await frontdeskService.getBills({ patientId: appointment.patient.patientId });
      if (bills && bills.length > 0) {
        setBill(bills[0]); // Latest bill
        setDiscountVal(bills[0].totalDiscount || '');
      } else {
        setBill(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeposit = async () => {
    if (!bill) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return alert('Enter valid amount');
    try {
      setSaving(true);
      await frontdeskService.payBill(bill._id, { amount: amt, paymentMode: payMode, purpose: 'Payment' });
      setPayAmount('');
      await fetchBill();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error adding payment');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDiscount = async () => {
    if (!bill) return;
    const disc = parseFloat(discountVal) || 0;
    try {
      setSaving(true);
      // We pass the existing items and set flat discount override
      await frontdeskService.updateBill(bill._id, {
        items: bill.items,
        discountType: 'flat',
        discountValue: disc
      });
      await fetchBill();
      if (onUpdate) onUpdate();
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
      // Send negative amount for refund
      await frontdeskService.payBill(bill._id, { amount: -Math.abs(amt), paymentMode: refundMode, purpose: 'Refund' });
      setRefundAmount('');
      await fetchBill();
      if (onUpdate) onUpdate();
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
      const rows = (bill.items || []).map((item, i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${i+1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.serviceName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${parseFloat(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-₹${parseFloat(item.discount||0).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1d4ed8">₹${parseFloat(item.totalPrice||0).toFixed(2)}</td>
        </tr>`).join('');
      const html = `<!DOCTYPE html><html><head><title>Invoice - ${patient?.name}</title>
        <style>body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b}</style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2563eb">
          <div style="display:flex;gap:16px;align-items:center;">
            ${clinicLogo ? `<img src="${clinicLogo}" alt="Clinic Logo" style="max-height:65px;max-width:180px;object-fit:contain;" />` : ''}
            <div>
              <h2 style="margin:0;color:#1d4ed8;font-size:20px">${clinicData?.name || localStorage.getItem('clinicName') || 'Clinic'}</h2>
              <p style="margin:4px 0 0;color:#64748b;font-size:12px">Medical Invoice / Receipt</p>
              ${clinicPhone ? `<p style="margin:4px 0 0;color:#64748b;font-size:12px;font-weight:600">&#128222; ${clinicPhone}</p>` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:900;color:#2563eb">INVOICE</div>
            <div style="color:#64748b;font-size:12px;margin-top:4px">Date: ${new Date(bill.billDate||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
            <div style="color:#64748b;font-size:11px">Status: <b style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">${bill.totalBalance>0?'UNPAID':'PAID'}</b></div>
          </div>
        </div>
        <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:24px">
          <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:6px">Bill To</div>
          <div style="font-weight:700;font-size:15px">${patient?.name||'—'}</div>
          <div style="color:#64748b;margin-top:2px">${patient?.gender||''} · ${patient?.age||''} yrs</div>
          <div style="color:#64748b">${patient?.phone||''}</div>
          <div style="color:#64748b">Patient ID: ${patient?.patientId||''}</div>
        </div>
        <table style="margin-bottom:20px"><thead><tr><th>#</th><th>Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-top:8px;font-weight:700">
          <span>Net Amount</span><span style="color:#1d4ed8">₹${parseFloat(bill.finalAmount||0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:${bill.totalBalance>0?'#fef2f2':'#f0fdf4'};border-radius:6px;margin-top:4px;font-weight:700;font-size:14px">
          <span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">Balance Due</span>
          <span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">₹${parseFloat(bill.totalBalance||0).toFixed(2)}</span>
        </div>
        <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
          Thank you for choosing ${clinicData?.name || 'our clinic'} · Computer-generated invoice
        </div></body></html>`;
      const subject = `Your Bill from ${clinicData?.name || localStorage.getItem('clinicName') || 'Clinic'}`;
      const body = `<p>Dear ${patient?.name || 'Patient'},</p><p>Please find attached your bill.</p>`;
      await sendDocumentAsEmail(html, targetEmail, subject, body, `Bill_${bill.billNo || bill._id?.slice(-6).toUpperCase() || 'Receipt'}.pdf`);
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
        <div className="pm-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="pm-overlay" onClick={onClose}>
        <div className="pm-content" onClick={e=>e.stopPropagation()} style={{ padding: 30, textAlign:'center' }}>
          <h4>No Bill Found</h4>
          <p className="text-muted">Generate a bill first to make payments.</p>
          <button className="btn btn-secondary mt-3" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const patient = appointment.patient;

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-content" onClick={e=>e.stopPropagation()}>
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
                onClick={() => handlePrintBill(patient, appointment.billSummary)}
              >
                <Printer size={16} /> Print bill
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
                  {emailing ? <span className="spinner-border spinner-border-sm" style={{width:12,height:12}} /> : <Mail size={16} />}
                </button>
              </div>
            </div>

            <div className="pm-summary">
              <div className="pm-summary-row">
                <span>Gross Bill Amount</span>
                <span>{bill.totalBilledAmount?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>Discount</span>
                <span>- {bill.totalDiscount?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>GST</span>
                <span>{bill.totalTax?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-bold">
                <span>Net Billed Amount</span>
                <span>{bill.finalAmount?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row">
                <span>Collected Amount</span>
                <span>{bill.receivedAmount?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-bold">
                <span>Net Paid Amount</span>
                <span>{bill.receivedAmount?.toFixed(0)}</span>
              </div>
              <div className="pm-summary-row pm-balance">
                <span>Balance Amount</span>
                <span>{bill.totalBalance?.toFixed(0)}</span>
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
                <div className="pm-inputs-row">
                  <div className="pm-input-group">
                    <label>Payment mode</label>
                    <select value={payMode} onChange={e=>setPayMode(e.target.value)}>
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="MOBILE">MOBILE</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="BANK TRANSFER">BANK TRANSFER</option>
                      <option value="INSURANCE">INSURANCE</option>
                    </select>
                  </div>
                  <div className="pm-input-group">
                    <label>Amount</label>
                    <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} />
                  </div>
                  <button className="pm-action-btn" onClick={handleAddDeposit} disabled={saving}>
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
                      onChange={e=>setDiscountVal(e.target.value)}
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
                <div style={{ fontSize: '0.85rem', marginBottom: 10, textAlign:'center' }}>Give Refund & add To Discount</div>
                <div className="pm-inputs-row" style={{ justifyContent: 'center' }}>
                  <div className="pm-input-group">
                    <label>Refund mode</label>
                    <select value={refundMode} onChange={e=>setRefundMode(e.target.value)} style={{ backgroundColor: '#fcd3d3' }}>
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="MOBILE">MOBILE</option>
                      <option value="BANK TRANSFER">BANK TRANSFER</option>
                    </select>
                  </div>
                  <div className="pm-input-group">
                    <label>Amount</label>
                    <input 
                      type="number" 
                      value={refundAmount} 
                      onChange={e=>setRefundAmount(e.target.value)}
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
                    {bill.payments.slice().reverse().slice(0, 3).map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.paidAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})} {new Date(p.paidAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td>{p.purpose?.toUpperCase() || 'APPOINTMENT'}</td>
                        <td style={{ color: p.amount < 0 ? '#dc2626' : 'inherit' }}>
                          {p.amount < 0 ? p.amount : p.amount}
                        </td>
                        <td>{p.paymentMode}</td>
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
