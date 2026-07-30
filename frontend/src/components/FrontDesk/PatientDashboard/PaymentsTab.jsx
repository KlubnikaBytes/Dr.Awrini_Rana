import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { Trash2, Edit2, FileText, PlusCircle } from 'lucide-react';

const PaymentsTab = ({ patient }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('Consultation, Lab and Other Services');

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const data = await frontdeskService.getBills();
        const patientBills = data.filter(b => b.patient?.patientId === patient.patientId);
        setBills(patientBills);
      } catch (error) {
        console.error('Error fetching payments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [patient]);

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex border-bottom ps-3 pt-3 gap-4" style={{ backgroundColor: '#f8f9fa' }}>
        <button 
          className={`btn border-0 rounded-0 px-2 py-2 fw-bold ${activeSubTab === 'Consultation, Lab and Other Services' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'Consultation, Lab and Other Services' ? '2px solid #0d6efd' : '2px solid transparent' }}
          onClick={() => setActiveSubTab('Consultation, Lab and Other Services')}
        >
          Consultation, Lab and Other Services
        </button>
        <button 
          className={`btn border-0 rounded-0 px-2 py-2 fw-bold ${activeSubTab === 'Deposits and Refunds' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'Deposits and Refunds' ? '2px solid #0d6efd' : '2px solid transparent' }}
          onClick={() => setActiveSubTab('Deposits and Refunds')}
        >
          Deposits and Refunds
        </button>
      </div>

      <div className="flex-grow-1 overflow-auto bg-light p-3">
        {loading ? (
          <div className="text-center mt-4">Loading...</div>
        ) : (
          <div className="bg-white rounded border shadow-sm">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0 text-primary fw-bold">{activeSubTab}</h5>
              <div className="fw-bold" style={{ fontSize: '18px' }}>
                Deposit Amount: <span className="text-success">₹ 0</span> <PlusCircle size={18} className="ms-2 text-muted" />
              </div>
            </div>
          <div className="rounded border shadow-sm overflow-hidden table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: '600px' }}>
              <thead className="table-light">
                <tr>
                  <th className="py-3">Date/Time</th>
                  <th>#Bill</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Category</th>
                  <th>Bill Amount</th>
                  <th>Details</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill._id}>
                    <td>{new Date(bill.createdAt).toLocaleDateString('en-CA')} / {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                    <td>{bill.billNumber || '18534'}</td>
                    <td className="text-primary fw-bold">₹{bill.totalAmount}</td>
                    <td>
                      <span className="badge bg-success-subtle text-success fw-normal px-2 py-1">Payment</span>
                    </td>
                    <td className="text-secondary">
                      {bill.paymentMethod || 'M-WALLET'} <Edit2 size={12} className="text-primary ms-1" />
                    </td>
                    <td className="d-flex align-items-center gap-2">
                      <FileText size={16} className={bill.totalAmount > 500 ? "text-primary" : "text-danger"} /> 
                      {bill.totalAmount > 500 ? 'Consultation' : 'Other'}
                    </td>
                    <td>₹{bill.totalAmount}</td>
                    <td></td>
                    <td>
                      <button className="btn btn-link text-secondary p-0">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">No payments found for this patient.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="d-flex justify-content-between p-3 text-muted small border-top">
              <span>1 — {bills.length} of {bills.length} results</span>
              <span>End of List</span>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsTab;
