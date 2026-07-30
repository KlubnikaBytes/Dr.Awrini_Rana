import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { Printer, Trash2 } from 'lucide-react';

const BillsTab = ({ patient }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        // Note: the backend filter is optional, so we'll filter on the frontend just to be safe
        const data = await frontdeskService.getBills();
        const patientBills = data.filter(b => b.patient?.patientId === patient.patientId);
        setBills(patientBills);
      } catch (error) {
        console.error('Error fetching bills', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [patient]);

  const totalDue = bills.reduce((acc, bill) => acc + (bill.due || 0), 0);

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5 className="mb-0 fw-bold">Bills</h5>
        <div className="d-flex align-items-center gap-4">
          <span className="text-primary fw-bold" style={{ fontSize: '18px' }}>
            Total Due Amount : <span className="text-danger">₹ {totalDue}</span>
          </span>
          <span className="fw-bold" style={{ fontSize: '18px' }}>
            Deposit Amount: <span className="text-success">₹ 0</span>
          </span>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto bg-light p-3">
        {loading ? (
          <div className="text-center mt-4">Loading...</div>
        ) : (
          <div className="rounded border shadow-sm overflow-hidden table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: '700px' }}>
              <thead className="table-light">
                <tr>
                  <th className="py-3">Date</th>
                  <th>#Bill</th>
                  <th>Department</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Billed</th>
                  <th>Discount</th>
                  <th>Refund</th>
                  <th>Service</th>
                  <th>Price</th>
                  <th>GST</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill._id}>
                    <td>{new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
                    <td>{bill.billNumber || '18534'}</td>
                    <td className="text-primary">Consultation</td>
                    <td>₹ {bill.totalAmount}</td>
                    <td>₹ {bill.due || 0}</td>
                    <td className="text-success d-flex align-items-center gap-2">
                      ₹ {bill.totalAmount} <Printer size={16} className="text-secondary" />
                    </td>
                    <td>₹ {bill.discount || 0}</td>
                    <td>₹ 0</td>
                    <td className="text-muted" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bill.items?.map(i => i.name).join(', ') || 'Consultation'}
                    </td>
                    <td>₹ {bill.totalAmount}</td>
                    <td>₹ {bill.tax || 0}</td>
                    <td>
                      <button className="btn btn-link text-secondary p-0">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan="12" className="text-center py-5 text-muted">No bills found for this patient.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="d-flex justify-content-between p-3 text-muted small border-top">
              <span>1 — {bills.length} of {bills.length} results</span>
              <span>End of List</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsTab;
