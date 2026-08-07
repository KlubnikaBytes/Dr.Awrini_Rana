import React, { useState } from 'react';
import { X, Mail, Phone, MessageCircle, Printer } from 'lucide-react';

const PrescriptionModal = ({ appointment, onClose }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const patient = appointment?.patient || {};
  const patientId = patient.patientId || 'ASR0000';
  const name = patient.name || 'Unknown';
  const age = patient.age || '0';
  const gender = patient.gender || 'Unknown';
  const dateStr = appointment?.date ? new Date(appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '30-Jul-2026';

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '90vw', height: '90vh' }}>
        <div className="modal-content h-100">
          
          {/* Header */}
          <div className="modal-header py-2">
            <h5 className="modal-title fs-6">Print Preview (1 Page)</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-0 d-flex overflow-hidden bg-light">
            
            {/* Left side: Print Preview Area */}
            <div className="flex-grow-1 overflow-auto d-flex justify-content-center p-4" style={{ backgroundColor: '#e9ecef' }}>
              <div 
                id="hp-print-area"
                className="bg-white shadow-sm border" 
                style={{ width: '210mm', minHeight: '297mm', padding: '15mm', margin: '0 auto' }}
              >
                {/* Prescription Header */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#0d6efd' }}>DR. ASWINI RANA</h2>
                    <div style={{ color: '#20c997', fontSize: '12px', lineHeight: '1.4', fontWeight: '500' }}>
                      MBBS(CAL),MD(MEDICINE),IPGMER<br/>
                      CCEBDM(DELHI)-Certificate in Diabetes Management<br/>
                      Consultant Physician & Diabetologist<br/>
                      Ex Doctor AIIMS Kalyani<br/>
                      SSKM/PG Hospital<br/>
                      Reg no- 65941(WBMC)
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="d-flex flex-column align-items-end mb-2">
                      <div className="fw-bold text-primary" style={{ fontSize: '24px', fontStyle: 'italic', letterSpacing: '-1px' }}>
                        ASR
                      </div>
                      <div style={{ fontSize: '10px', color: '#6c757d' }}>Doctor Clinic</div>
                    </div>
                    <div className="d-flex align-items-center justify-content-end gap-2" style={{ color: '#0d6efd' }}>
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                        <Phone size={14} fill="currentColor" />
                      </div>
                      <h4 className="fw-bold m-0">9002535240</h4>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '2px dotted #0d6efd', margin: '15px 0' }}></div>

                {/* Patient Info Row */}
                <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '13px' }}>
                  <div className="fw-bold">
                    {patientId}: {name.toUpperCase()} ({age}y, {gender})
                  </div>
                  <div className="fw-bold">
                    <span className="me-4">Date</span> : {dateStr}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #dee2e6', margin: '10px 0' }}></div>
                
                {/* Prescription body area (empty for preview) */}
                <div className="mt-4" style={{ minHeight: '300px' }}>
                  {/* Doctor's notes would go here */}
                </div>

              </div>
            </div>

            {/* Right side: Controls Sidebar */}
            <div className="bg-white border-start d-flex flex-column" style={{ width: '350px' }}>
              <div className="p-4 flex-grow-1">
                
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Print Language</label>
                  <select className="form-select text-dark">
                    <option>English</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted border-end-0">
                      <Mail size={16} />
                    </span>
                    <input 
                      type="email" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted border-end-0">
                      <Phone size={16} />
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="Enter Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="p-3 border-top d-flex gap-2 justify-content-end bg-light">
                <button className="btn btn-outline-success d-flex align-items-center gap-2 fw-bold bg-white" onClick={() => alert('WhatsApp/SMS Sent!')}>
                  <MessageCircle size={18} />
                  WhatsApp/SMS
                </button>
                <button className="btn btn-outline-primary d-flex align-items-center gap-2 fw-bold bg-white" onClick={() => alert('Email Sent!')}>
                  <Mail size={18} />
                  Email
                </button>
                <button className="btn btn-primary d-flex align-items-center gap-2 fw-bold" onClick={() => window.print()}>
                  <Printer size={18} />
                  Print
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;
