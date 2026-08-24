import React, { useState, useEffect } from 'react';
import { X, Printer, Mail } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';

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

  useEffect(() => {
    fetchBill();
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
                <input type="text" placeholder="Email" />
                <button><Mail size={16} /></button>
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
