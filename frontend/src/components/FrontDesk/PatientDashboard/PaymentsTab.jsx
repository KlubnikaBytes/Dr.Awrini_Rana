import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { CreditCard, ArrowDownCircle, AlertCircle, FileText } from 'lucide-react';

const PaymentsTab = ({ patient }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    frontdeskService.getBills({ patientId: patient.patientId })
      .then(bills => {
        // Extract all individual payment entries from all bills
        const allPayments = [];
        (bills || []).forEach(bill => {
          (bill.payments || []).forEach(p => {
            allPayments.push({
              ...p,
              billId: bill._id,
              billNumber: bill.billNumber || bill._id.toString().substring(18),
              billAmount: bill.finalAmount,
              billDate: bill.billDate || bill.createdAt,
              services: bill.items?.map(i => i.serviceName).join(', ')
            });
          });
        });
        // Sort descending by date
        allPayments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
        setPayments(allPayments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patient]);

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f8fafc' }}>
      
      {/* Header Summary */}
      <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-white">
        <div>
          <h5 className="mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <CreditCard size={20} style={{ color: '#059669' }}/> Payment History
          </h5>
          <div className="text-secondary small">All payments received for this patient</div>
        </div>
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex flex-column align-items-end">
            <span className="text-secondary small fw-semibold text-uppercase">Total Received</span>
            <span className="fw-black" style={{ fontSize: '1.4rem', color: '#059669' }}>₹ {totalPayments.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-grow-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center mt-5 text-secondary">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-secondary">
            <ArrowDownCircle size={40} style={{ opacity: 0.3 }}/>
            <div className="fw-semibold">No payments recorded yet</div>
            <div className="small">Payments made on bills will appear here</div>
          </div>
        ) : (
          <div className="bg-white rounded-3 shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase', paddingLeft: 24 }}>Date & Time</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Mode</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Purpose / Details</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Related Bill</th>
                    <th className="text-secondary fw-semibold py-3 text-end" style={{ fontSize: '0.72rem', textTransform: 'uppercase', paddingRight: 24 }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: 24 }}>
                        <div className="fw-semibold text-dark">{new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-secondary small">{new Date(p.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <span className="badge rounded-pill" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                          {p.paymentMode}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{p.purpose || 'Payment received'}</div>
                        <div className="text-secondary small text-truncate" style={{ maxWidth: 250 }}>{p.services}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 text-secondary">
                          <FileText size={14}/> {p.billNumber}
                        </div>
                        <div className="small">Billed: ₹{p.billAmount?.toFixed(2)}</div>
                      </td>
                      <td className="text-end fw-black" style={{ color: '#059669', fontSize: '1rem', paddingRight: 24 }}>
                        +₹ {parseFloat(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between p-3 text-muted small" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <span>Showing {payments.length} payment(s)</span>
              <span>End of List</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsTab;
