import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import reportService from '../../services/reportService';
import { getLocalDateString } from '../../utils/dateUtils';
import CareRecordBillModal from '../CareRecordBillModal';

const ReferralAnalytics = () => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [activeTab, setActiveTab] = useState('BY');
  const [loading, setLoading] = useState(false);
  
  const [referredByStats, setReferredByStats] = useState([]);
  const [referredToStats, setReferredToStats] = useState([]);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReferralAnalytics(startDate, endDate);
      setReferredByStats(data.referredByStats || []);
      setReferredToStats(data.referredToStats || []);
      setExpandedDoc(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const activeStats = activeTab === 'BY' ? referredByStats : referredToStats;
  const filteredStats = activeStats.filter(s => s.doctorName.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenVisitPad = (patient) => {
    setSelectedPatientId(patient._id);
    setSelectedAppointmentId(patient.appointmentId || null);
    setShowBillModal(true);
  };

  return (
    <div className="bg-white h-100 mt-2">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex border-bottom">
          <span 
            className={`hp-inner-tab ${activeTab === 'BY' ? 'active border-primary text-primary' : ''}`} 
            style={{ borderBottomWidth: activeTab === 'BY' ? '2px' : '0', cursor: 'pointer', paddingBottom: '8px', marginRight: '20px', fontWeight: activeTab === 'BY' ? 600 : 400 }} 
            onClick={() => { setActiveTab('BY'); setExpandedDoc(null); }}
          >
            Referred By (Incoming)
          </span>
          <span 
            className={`hp-inner-tab ${activeTab === 'TO' ? 'active border-primary text-primary' : ''}`} 
            style={{ borderBottomWidth: activeTab === 'TO' ? '2px' : '0', cursor: 'pointer', paddingBottom: '8px', fontWeight: activeTab === 'TO' ? 600 : 400 }} 
            onClick={() => { setActiveTab('TO'); setExpandedDoc(null); }}
          >
            Referred To (Outgoing)
          </span>
        </div>
        
        <div className="d-flex gap-3 align-items-center">
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control form-control-sm bg-light border-0 ps-3" 
              placeholder="Search Doctor" 
              style={{ width: '200px', borderRadius: '8px' }} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={14} className="position-absolute top-50 translate-middle-y end-0 me-2 text-primary" />
          </div>
          <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-3 border">
            <Calendar size={16} className="text-primary" />
            <input type="date" className="border-0 bg-transparent small fw-semibold text-dark" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ outline: 'none' }} />
            <span className="text-muted small px-1">to</span>
            <input type="date" className="border-0 bg-transparent small fw-semibold text-dark" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ outline: 'none' }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
      ) : (
        <div className="table-responsive border rounded bg-light p-2">
          <table className="table table-hover align-middle bg-white border mb-0 rounded overflow-hidden shadow-sm">
            <thead className="bg-light border-bottom text-muted small">
              <tr>
                <th className="ps-4 py-3">Doctor Name</th>
                <th className="text-center py-3">Total Patients</th>
                <th className="text-end py-3">Cash (₹)</th>
                <th className="text-end py-3">UPI (₹)</th>
                <th className="text-end py-3">Card (₹)</th>
                <th className="text-end pe-4 py-3">Total Revenue (₹)</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">No referral data found for this period.</td>
                </tr>
              ) : (
                filteredStats.map(stat => (
                  <React.Fragment key={stat.doctorName}>
                    <tr style={{ cursor: 'pointer', backgroundColor: expandedDoc === stat.doctorName ? '#f8f9fa' : 'transparent' }} onClick={() => setExpandedDoc(expandedDoc === stat.doctorName ? null : stat.doctorName)}>
                      <td className="ps-4 py-3 fw-bold text-dark">{stat.doctorName}</td>
                      <td className="text-center py-3 fw-semibold">
                        <span className="badge bg-primary rounded-pill px-3">{stat.count}</span>
                      </td>
                      <td className="text-end py-3 text-muted">{Math.round(stat.cash).toLocaleString()}</td>
                      <td className="text-end py-3 text-muted">{Math.round(stat.upi).toLocaleString()}</td>
                      <td className="text-end py-3 text-muted">{Math.round(stat.card).toLocaleString()}</td>
                      <td className="text-end pe-4 py-3 fw-bold text-success">{Math.round(stat.total).toLocaleString()}</td>
                      <td className="text-center">
                        {expandedDoc === stat.doctorName ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-muted" />}
                      </td>
                    </tr>
                    {expandedDoc === stat.doctorName && (
                      <tr>
                        <td colSpan="7" className="p-0 border-0">
                          <div className="bg-light p-3 mx-3 mb-3 rounded border">
                            <h6 className="small fw-bold text-muted mb-3">Patients Referred {activeTab === 'BY' ? 'By' : 'To'} {stat.doctorName}</h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-borderless mb-0">
                                <thead>
                                  <tr className="border-bottom border-light">
                                    <th className="text-muted small fw-semibold">Patient ID</th>
                                    <th className="text-muted small fw-semibold">Name</th>
                                    <th className="text-muted small fw-semibold">Phone</th>
                                    <th className="text-end text-muted small fw-semibold">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stat.patients.map((p, idx) => (
                                    <tr key={idx} className="border-bottom border-white">
                                      <td className="small">{p.patientId}</td>
                                      <td className="small fw-semibold">{p.name}</td>
                                      <td className="small text-muted">{p.phone || '-'}</td>
                                      <td className="text-end">
                                        <button 
                                          className="btn btn-sm btn-outline-primary py-0" 
                                          style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                                          onClick={() => handleOpenVisitPad(p)}
                                        >
                                          <FileText size={12} className="me-1" /> Visit Pad
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showBillModal && (
        <CareRecordBillModal 
          onClose={() => { setShowBillModal(false); setSelectedPatientId(null); setSelectedAppointmentId(null); }}
          patientId={selectedPatientId}
          appointmentId={selectedAppointmentId}
        />
      )}
    </div>
  );
};

export default ReferralAnalytics;
