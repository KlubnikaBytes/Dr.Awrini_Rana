import React, { useState, useEffect } from 'react';
import { X, Printer, Share2, Info, PlusCircle, Trash2 } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import { getLocalDateString } from '../../utils/dateUtils';

const AddBillModal = ({ appointment, onClose, onSuccess }) => {
  const [bills, setBills] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  
  useEffect(() => {
    fetchBills();
  }, [appointment]);

  const fetchBills = async () => {
    try {
      const data = await frontdeskService.getBills({ appointmentId: appointment._id });
      setBills(data);
    } catch (error) {
      console.error(error);
    }
  };

  const currentBill = bills[0] || null;

  const handlePay = async () => {
    if (!currentBill || !payAmount) return;
    try {
      await frontdeskService.payBill(currentBill._id, {
        amount: Number(payAmount),
        paymentMode
      });
      alert('Payment successful!');
      onSuccess();
    } catch (error) {
      alert('Error making payment');
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content bg-light">
          
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between p-2 text-white shadow-sm" style={{ backgroundColor: '#4a4a75' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px' }}>
                <Info size={16} />
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Mrs. {appointment.patient?.name}</h6>
                <div className="small text-white-50">
                  Female | {appointment.patient?.age} Years | {appointment.patient?.patientId} 
                  <button className="btn btn-warning btn-sm py-0 px-2 ms-3 fw-bold rounded-pill" style={{ fontSize: '11px' }}>Visit Pad</button>
                </div>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-4">
              <div className="d-flex flex-column align-items-center" style={{ cursor: 'pointer' }}>
                <span className="small">Appnt</span>
              </div>
              <div className="d-flex flex-column align-items-center border-bottom border-2 border-white pb-1" style={{ cursor: 'pointer' }}>
                <span className="small fw-bold">Add Bills</span>
              </div>
              <div className="d-flex flex-column align-items-center text-white-50" style={{ cursor: 'pointer' }}>
                <span className="small">Bills</span>
              </div>
              <div className="d-flex flex-column align-items-center text-white-50" style={{ cursor: 'pointer' }}>
                <span className="small">Payments</span>
              </div>
              <div className="d-flex flex-column align-items-center text-white-50" style={{ cursor: 'pointer' }}>
                <span className="small">Visits</span>
              </div>
              <X size={24} className="ms-3" style={{ cursor: 'pointer' }} onClick={onClose} />
            </div>
          </div>

          {/* Body */}
          <div className="d-flex flex-grow-1 overflow-hidden">
            
            {/* Left Content */}
            <div className="flex-grow-1 p-3 d-flex flex-column overflow-auto bg-white m-2 rounded shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold">Bill Date :</span>
                  <input type="date" className="form-control form-control-sm w-auto" defaultValue={getLocalDateString()} />
                  <button className="btn btn-outline-secondary btn-sm">Today</button>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold">Deposit Amount:</span>
                  <span className="text-success fw-bold">₹ {currentBill?.depositAmount || 0}</span>
                  <PlusCircle size={18} className="text-muted" />
                </div>
              </div>

              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th style={{ width: '40%' }}>Service Name</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>GST %</th>
                    <th>Discount</th>
                    <th>Total Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {currentBill?.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <select className="form-select form-select-sm border-0 bg-transparent">
                          <option>{item.serviceName}</option>
                        </select>
                      </td>
                      <td>{item.qty}</td>
                      <td>₹ {item.unitPrice}</td>
                      <td>{item.gstPercent}</td>
                      <td>{item.discount}</td>
                      <td className="text-danger">₹ {item.totalPrice}</td>
                      <td className="text-center text-muted"><Trash2 size={14} /></td>
                    </tr>
                  ))}
                  {!currentBill && (
                    <tr>
                      <td>1</td>
                      <td>
                        <select className="form-select form-select-sm border-0 text-muted">
                          <option>Add Service</option>
                        </select>
                      </td>
                      <td></td>
                      <td>₹</td>
                      <td>0</td>
                      <td></td>
                      <td className="text-danger">₹ 0</td>
                      <td className="text-center text-muted"><Trash2 size={14} /></td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              <div className="mt-auto pt-3 border-top d-flex justify-content-between text-muted small">
                 <span>☆ Patient has an Appointment on this day which doesn't have a Bill</span>
              </div>
            </div>

            {/* Right Sidebar - Summary */}
            <div className="bg-white m-2 ms-0 rounded shadow-sm d-flex flex-column" style={{ width: '350px' }}>
              <div className="p-3 border-bottom bg-light">
                <h6 className="fw-bold mb-3">Bills Summary:</h6>
                
                <div className="d-flex justify-content-between mb-2 small">
                  <span>Total Billed Amount</span>
                  <span className="fw-bold">₹ {currentBill?.totalBilledAmount || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small text-muted">
                  <span>Discount Amount <Info size={12}/></span>
                  <span>₹ - {currentBill?.totalDiscount || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small text-muted">
                  <span>Tax Amount</span>
                  <span>₹ {currentBill?.totalTax || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span>Final Amount</span>
                  <span className="fw-bold">₹ {currentBill?.finalAmount || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span>Received Amount</span>
                  <span className="fw-bold">₹ {currentBill?.receivedAmount || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-3 small text-muted">
                  <span>Refund Amount</span>
                  <span>₹ - {currentBill?.refundAmount || 0}</span>
                </div>
                <div className="d-flex justify-content-between pt-2 border-top">
                  <span className="fw-bold">Total Balance</span>
                  <span className="fw-bold fs-5">₹ {currentBill?.totalBalance || 0}</span>
                </div>
              </div>

              <div className="p-3 flex-grow-1 d-flex flex-column">
                <div className="text-center mb-3">
                  <span className="text-primary fw-bold text-decoration-underline pb-1 border-primary" style={{ borderBottom: '2px solid' }}>Pay Bill</span>
                </div>
                
                <div className="d-flex gap-2 mb-3">
                  <select className="form-select flex-grow-1" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                  </select>
                  <input 
                    type="number" 
                    className="form-control w-50" 
                    placeholder="0" 
                    value={payAmount} 
                    onChange={(e) => setPayAmount(e.target.value)} 
                  />
                  <button className="btn btn-light border"><Trash2 size={16} className="text-muted"/></button>
                </div>

                <input type="text" className="form-control mb-2" placeholder="Add Details" />
                <span className="text-primary small fw-bold d-block mb-3"><PlusCircle size={14} className="me-1"/> Payment Mode</span>

                <button className="btn btn-primary w-100 fw-bold mb-3" onClick={handlePay}>
                  Pay ₹ {payAmount || 0}
                </button>

                <div className="d-flex gap-2 mt-auto">
                  <button className="btn btn-outline-secondary flex-grow-1 d-flex justify-content-center align-items-center gap-2">
                    <Printer size={16}/> Print
                  </button>
                  <button className="btn btn-outline-secondary flex-grow-1 d-flex justify-content-center align-items-center gap-2">
                    <Share2 size={16}/> Share
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBillModal;
