import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, X, Search, Check, AlertCircle, Printer, Mail, Smartphone, CheckCircle } from 'lucide-react';
import clinicService from '../services/clinicService';
import { sendDocumentAsEmail } from '../services/emailService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MergeBillModal({ show, onClose, patientId, patientName }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [successData, setSuccessData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  useEffect(() => {
    if (show && patientId) {
      // Set default date range to today
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      fetchBills(today, today);

      // Fetch patient details to pre-fill email/phone
      const token = localStorage.getItem('token');
      const clinicId = localStorage.getItem('clinicId');
      axios.get(`${API_URL}/frontdesk/patients/search?q=${patientId}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': clinicId }
      }).then(res => {
        const pt = res.data.find(p => p.uhid === patientId || p.patientId === patientId) || res.data[0];
        if (pt) {
          setPatientEmail(pt.email || pt.patientEmail || '');
          setPatientPhone(pt.phone || pt.patientPhone || '');
        }
      }).catch(err => console.error("Could not fetch patient details", err));

    } else {
      setBills([]);
      setSelectedBillIds([]);
      setGlobalDiscount(0);
      setPaymentAmount(0);
      setSuccessData(null);
      setPatientEmail('');
      setPatientPhone('');
    }
  }, [show, patientId]);

  const fetchBills = async (start, end) => {
    if (!patientId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const clinicId = localStorage.getItem('clinicId');
      
      let url = `${API_URL}/bills/patient/${patientId}?`;
      if (start) url += `startDate=${start}&`;
      if (end) url += `endDate=${end}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': clinicId }
      });
      setBills(res.data);
      
      // Auto-select unpaid bills by default
      const unpaid = res.data.filter(b => b.totalBalance > 0).map(b => b._id);
      setSelectedBillIds(unpaid);
    } catch (err) {
      console.error(err);
      alert('Error fetching bills');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchBills(startDate, endDate);
  };

  const toggleSelection = (id) => {
    if (selectedBillIds.includes(id)) {
      setSelectedBillIds(selectedBillIds.filter(b => b !== id));
    } else {
      setSelectedBillIds([...selectedBillIds, id]);
    }
  };

  const handleMergeAndPay = async () => {
    if (selectedBillIds.length === 0) return alert('Select at least one bill');
    if (paymentAmount < 0) return alert('Invalid payment amount');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const clinicId = localStorage.getItem('clinicId');
      
      await axios.post(`${API_URL}/bills/merge-pay`, {
        billIds: selectedBillIds,
        globalDiscount: Number(globalDiscount) || 0,
        paymentAmount: Number(paymentAmount) || 0,
        paymentMode
      }, {
        headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': clinicId }
      });

      setSuccessData({
        bills: selectedBills,
        globalDiscount: Number(globalDiscount),
        paymentAmount: Number(paymentAmount),
        paymentMode
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error processing merged payment');
    } finally {
      setLoading(false);
    }
  };

  const getReceiptHTML = async (billsToRender, discount, payAmt, mode) => {
    const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';
    const storedClinicId = localStorage.getItem('clinicId') || '';
    const storedClinicName = localStorage.getItem('clinicName') || '';
    let clinicLogo = null;
    let clinicPhone = '9002535240';
    let clinicName = storedClinicName || 'Clinic';
    let clinicAddress = localStorage.getItem('clinicAddress') || '';

    try {
      const all = await clinicService.getAllClinics();
      const clinicData = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;
      if (clinicData) {
        clinicName = clinicData.name || clinicName;
        clinicPhone = clinicData.phone || clinicPhone;
        clinicAddress = clinicData.address || clinicAddress;
        const rawLogoPath = clinicData.logo || null;
        clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;
      }
    } catch (err) {}

    let allItemsHtml = '';
    billsToRender.forEach((b, idx) => {
      const billDateStr = new Date(b.billDate || b.createdAt).toLocaleDateString('en-IN');
      const billType = b.sourceType || (b.isLabOrder ? 'Lab' : 'Other');
      allItemsHtml += `
        <tr style="background:#f8fafc">
          <td colspan="4" style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;letter-spacing:0.5px">
            Bill #${idx + 1} &mdash; ${billType} (${billDateStr})
          </td>
        </tr>
      `;
      b.items?.forEach(item => {
        allItemsHtml += `
          <tr>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;padding-left:24px">${item.serviceName}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right">&#8377;${(item.unitPrice||0).toFixed(2)}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-&#8377;${(item.discount||0).toFixed(2)}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">&#8377;${(item.totalPrice||item.total||0).toFixed(2)}</td>
          </tr>
        `;
      });
      // Handle LabOrders tests array
      b.tests?.forEach(item => {
        allItemsHtml += `
          <tr>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;padding-left:24px">${item.name}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right">&#8377;${(item.unitPrice||0).toFixed(2)}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-&#8377;${(item.discount||0).toFixed(2)}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">&#8377;${(item.totalPrice||0).toFixed(2)}</td>
          </tr>
        `;
      });
    });

    const totalBilledValue = billsToRender.reduce((acc, curr) => acc + (Number(curr.finalAmount) || 0), 0);
    const totalPreviouslyPaid = billsToRender.reduce((acc, curr) => acc + (Number(curr.receivedAmount) || 0), 0);
    const outstandingBeforePayment = Math.max(0, totalBilledValue - totalPreviouslyPaid);
    const newBalance = Math.max(0, outstandingBeforePayment - discount - payAmt);

    const html = `<!DOCTYPE html><html><head><title>Consolidated Invoice &#8212; ${patientName}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI', Arial, sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}@media print{body{padding:16px}}</style>
</head><body>
<div id="pdf-content" style="background:#fff">
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #3b82f6">
  <div style="display:flex;flex-direction:column;align-items:flex-start">
    ${clinicLogo ? `<img src="${clinicLogo}" style="max-height:80px;max-width:240px;object-fit:contain;margin-bottom:10px" />` : `<h2 style="margin:0;color:#3b82f6;font-size:24px;font-weight:900;margin-bottom:10px">${clinicName}</h2>`}
    <div style="display:flex;align-items:center;gap:6px;font-size:1.15rem;font-weight:800;color:#000">
      ${clinicPhone}
    </div>
    <div style="margin:6px 0 0;color:#64748b;font-size:12px">${clinicAddress}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:22px;font-weight:900;color:#3b82f6;letter-spacing:1px">CONSOLIDATED RECEIPT</div>
    <div style="color:#64748b;font-size:12px;margin-top:4px;font-weight:600">Generated: ${new Date().toLocaleString('en-IN')}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
  <div style="background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Patient Info</div>
    <div style="font-weight:700;font-size:15px">${patientName}</div>
    <div style="color:#64748b;margin-top:3px">ID: ${patientId}</div>
  </div>
  <div style="background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Payment Info</div>
    <div style="font-weight:700;font-size:14px;color:#059669">Paid Amount: &#8377; ${payAmt.toFixed(2)}</div>
    <div style="color:#64748b;margin-top:3px">Mode: ${mode}</div>
  </div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
  <thead>
    <tr style="background:#f1f5f9">
      <th style="padding:10px 12px;text-align:left;color:#475569;text-transform:uppercase;font-size:11px">Service Name</th>
      <th style="padding:10px 12px;text-align:right;color:#475569;text-transform:uppercase;font-size:11px">Rate</th>
      <th style="padding:10px 12px;text-align:right;color:#475569;text-transform:uppercase;font-size:11px">Discount</th>
      <th style="padding:10px 12px;text-align:right;color:#475569;text-transform:uppercase;font-size:11px">Net Amount</th>
    </tr>
  </thead>
  <tbody>
    ${allItemsHtml}
  </tbody>
</table>

<div style="width:340px;margin-left:auto;border:1px solid #e2e8f0;border-radius:8px;padding:15px;background:#f8fafc">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Grand Total (All Services):</span><span>&#8377; ${totalBilledValue.toFixed(2)}</span></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#64748b"><span>Previously Paid:</span><span>- &#8377; ${totalPreviouslyPaid.toFixed(2)}</span></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-weight:600"><span>Outstanding Balance:</span><span>&#8377; ${outstandingBeforePayment.toFixed(2)}</span></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#059669"><span>New Discount:</span><span>- &#8377; ${discount.toFixed(2)}</span></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:12px;color:#059669;font-weight:700"><span>Paid Now:</span><span>&#8377; ${payAmt.toFixed(2)}</span></div>
  <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid #e2e8f0;font-size:15px;font-weight:800;color:${newBalance>0?'#dc2626':'#059669'}"><span>Current Balance Due:</span><span>&#8377; ${newBalance.toFixed(2)}</span></div>
</div>

<div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
  Thank you for choosing ${clinicName} &#183; Computer-generated invoice
  <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
</div>
</div>
</body></html>`;
    return html;
  };

  const doPrint = async () => {
    if (!successData) return;
    const html = await getReceiptHTML(successData.bills, successData.globalDiscount, successData.paymentAmount, successData.paymentMode);
    const win = window.open('', '_blank');
    if (!win) return alert("Popup blocked! Please allow popups.");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const doEmail = async () => {
    if (!successData) return;
    let targetEmail = window.prompt("Enter email address to send the consolidated receipt:", patientEmail);
    if (!targetEmail) return;
    
    setSendingEmail(true);
    try {
      const html = await getReceiptHTML(successData.bills, successData.globalDiscount, successData.paymentAmount, successData.paymentMode);
      await sendDocumentAsEmail(html, targetEmail, `Consolidated Receipt - ${patientName}`, `<p>Dear ${patientName},</p><p>Please find attached your consolidated receipt for the payment of Rs. ${successData.paymentAmount} made on ${new Date().toLocaleDateString()}.</p><p>Thank you.</p>`, 'receipt.pdf');
      alert("Receipt sent successfully via email!");
    } catch (err) {
      alert("Failed to send email.");
      console.error(err);
    } finally {
      setSendingEmail(false);
    }
  };

  const doWhatsApp = () => {
    if (!successData) return;
    let targetPhone = window.prompt("Enter WhatsApp number (with country code, e.g. 91XXXXXXXXXX):", patientPhone ? (patientPhone.startsWith('91') ? patientPhone : `91${patientPhone}`) : '');
    if (!targetPhone) return;
    
    const text = `Dear ${patientName}, your consolidated payment of Rs. ${successData.paymentAmount} has been received successfully on ${new Date().toLocaleDateString()}. Thank you.`;
    window.open(`https://wa.me/${targetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!show) return null;

  // Calculate totals for selected bills
  const selectedBills = bills.filter(b => selectedBillIds.includes(b._id));
  const subtotalBalance = selectedBills.reduce((acc, curr) => acc + curr.totalBalance, 0);
  const finalPayable = Math.max(0, subtotalBalance - globalDiscount);

  // Auto-fill payment amount if user hasn't typed anything yet or if it was matching exactly
  const handleDiscountChange = (e) => {
    const val = Number(e.target.value);
    setGlobalDiscount(val);
    setPaymentAmount(Math.max(0, subtotalBalance - val));
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          
          <div className="modal-header border-bottom-0 bg-primary bg-gradient text-white rounded-top-4 py-3">
            <div>
              <h5 className="modal-title fw-bold mb-0">Consolidated Billing & Merge</h5>
              <div className="small opacity-75">Patient: {patientName} ({patientId})</div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 bg-light">
            {/* Filter Section */}
            <div className="card border-0 shadow-sm mb-4 rounded-4">
              <div className="card-body">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-secondary mb-1">Date Range (From)</label>
                    <input type="date" className="form-control bg-light" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-secondary mb-1">Date Range (To)</label>
                    <input type="date" className="form-control bg-light" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <button className="btn btn-primary w-100 fw-semibold" onClick={handleSearch} disabled={loading}>
                      <Search size={16} className="me-2"/> Fetch Bills
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {successData ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
                <CheckCircle size={64} className="text-success mb-3" />
                <h4 className="fw-bold mb-2">Payment Successful!</h4>
                <p className="text-muted mb-4">Rs. {successData.paymentAmount} received via {successData.paymentMode}.</p>
                <div className="d-flex gap-3 mt-3">
                  <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={doPrint}>
                    <Printer size={18} /> Print
                  </button>
                  <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={doEmail} disabled={sendingEmail}>
                    {sendingEmail ? <span className="spinner-border spinner-border-sm"></span> : <Mail size={18} />} Email
                  </button>
                  <button className="btn btn-outline-success d-flex align-items-center gap-2" onClick={doWhatsApp}>
                    <Smartphone size={18} /> WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="row g-4">
                {/* Bills List */}
                <div className="col-md-7">
                  <h6 className="fw-bold mb-3 d-flex align-items-center">
                    <FileText size={18} className="me-2 text-primary" />
                    Available Bills
                  </h6>
                  
                  {loading && bills.length === 0 ? (
                    <div className="text-center py-5 text-muted">Loading bills...</div>
                  ) : bills.length === 0 ? (
                    <div className="text-center py-5 text-muted bg-white rounded-4 border">No bills found for this date range.</div>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {bills.map(bill => {
                        const isSelected = selectedBillIds.includes(bill._id);
                        return (
                          <div 
                            key={bill._id} 
                            className={`card border-0 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary bg-opacity-10' : 'bg-white'}`}
                            onClick={() => toggleSelection(bill._id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="card-body p-3">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <div className={`form-check mb-0 ${isSelected ? 'text-primary' : ''}`}>
                                    <input 
                                      type="checkbox" 
                                      className="form-check-input mt-0" 
                                      checked={isSelected}
                                      readOnly
                                    />
                                  </div>
                                  <span className="badge bg-secondary">{bill.sourceType || (bill.isLabOrder ? 'Lab' : 'Other')}</span>
                                  <span className="small text-muted">{new Date(bill.billDate || bill.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="fw-bold fs-5 text-dark">₹{bill.totalBalance || bill.balanceAmount || 0}</div>
                              </div>
                              
                              <div className="small text-muted mb-1">
                                {(bill.items || bill.tests || []).map(item => item.serviceName || item.name).join(', ')}
                              </div>
                              <div className="d-flex justify-content-between small">
                                <span>Total: ₹{bill.finalAmount || 0}</span>
                                <span className="text-success">Paid: ₹{bill.receivedAmount || 0}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Merge & Payment Section */}
                <div className="col-md-5">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4 d-flex flex-column">
                      <h6 className="fw-bold mb-4">Consolidated Summary</h6>
                      
                      <div className="d-flex justify-content-between mb-3">
                        <span className="text-muted">Selected Bills</span>
                        <span className="fw-semibold">{selectedBills.length}</span>
                      </div>
                      
                      <div className="d-flex justify-content-between mb-3">
                        <span className="text-muted">Total Due Balance</span>
                        <span className="fw-bold fs-5">₹{subtotalBalance}</span>
                      </div>

                      <hr className="my-3 border-dashed" />

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-secondary">Apply Global Discount (₹)</label>
                        <input 
                          type="number" 
                          className="form-control bg-light" 
                          value={globalDiscount} 
                          onChange={handleDiscountChange}
                          min="0"
                          max={subtotalBalance}
                        />
                        {globalDiscount > 0 && (
                          <div className="form-text text-success small mt-1">
                            Discount will be distributed across selected bills.
                          </div>
                        )}
                      </div>

                      <div className="d-flex justify-content-between mb-4 bg-light p-3 rounded-3">
                        <span className="fw-bold">Final Payable Amount</span>
                        <span className="fw-bold fs-4 text-primary">₹{finalPayable}</span>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-secondary">Amount Being Paid Now</label>
                        <input 
                          type="number" 
                          className="form-control form-control-lg fw-bold text-success" 
                          value={paymentAmount} 
                          onChange={e => setPaymentAmount(e.target.value)}
                          min="0"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-bold text-secondary">Payment Mode</label>
                        <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                          <option value="CASH">CASH</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">CARD</option>
                          <option value="NETBANKING">NETBANKING</option>
                        </select>
                      </div>

                      <div className="mt-auto">
                        {subtotalBalance === 0 && selectedBills.length > 0 ? (
                          <button 
                            className="btn btn-success btn-lg w-100 fw-bold rounded-3" 
                            onClick={() => {
                              setSuccessData({
                                bills: selectedBills,
                                globalDiscount: Number(globalDiscount),
                                paymentAmount: 0,
                                paymentMode: paymentMode
                              });
                            }}
                          >
                            Generate Receipt
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary btn-lg w-100 fw-bold rounded-3" 
                            onClick={handleMergeAndPay}
                            disabled={loading || selectedBills.length === 0}
                          >
                            {loading ? 'Processing...' : `Merge & Pay ₹${paymentAmount}`}
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
