import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { Calendar, User, Clock, FileText, CalendarCheck } from 'lucide-react';

const VisitsTab = ({ patient }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    frontdeskService.getAppointments()
      .then(data => {
        const patientVisits = data.filter(a => a.patient?.patientId === patient.patientId);
        patientVisits.sort((a, b) => new Date(b.date) - new Date(a.date));
        setVisits(patientVisits);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patient]);

  // Find the soonest upcoming follow-up date
  const nextFollowUp = visits
    .filter(v => v.followUpDate && new Date(v.followUpDate) >= new Date())
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))[0];

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f8fafc' }}>

      {/* Header Summary */}
      <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-white">
        <div>
          <h5 className="mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <Calendar size={20} style={{ color: '#2563eb' }} /> Visit History
          </h5>
          <div className="text-secondary small">Past and upcoming appointments</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          {nextFollowUp && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
              <CalendarCheck size={18} style={{ color: '#16a34a' }} />
              <div>
                <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Next Follow-up</div>
                <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 800 }}>
                  {new Date(nextFollowUp.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          )}
          <div className="d-flex flex-column align-items-end">
            <span className="text-secondary small fw-semibold text-uppercase">Total Visits</span>
            <span className="fw-black" style={{ fontSize: '1.4rem', color: '#1e293b' }}>{visits.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-grow-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center mt-5 text-secondary">Loading visits...</div>
        ) : visits.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-secondary">
            <Calendar size={40} style={{ opacity: 0.3 }} />
            <div className="fw-semibold">No visits found</div>
            <div className="small">Patient hasn't had any appointments yet</div>
          </div>
        ) : (
          <div className="bg-white rounded-3 shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase', paddingLeft: 24 }}>Date & Time</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Doctor</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>Reason</th>
                    <th className="text-secondary fw-semibold py-3" style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#16a34a' }}>Follow-up Date</th>
                    <th className="text-secondary fw-semibold py-3 text-end" style={{ fontSize: '0.72rem', textTransform: 'uppercase', paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v, i) => (
                    <tr key={v._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ paddingLeft: 24 }}>
                        <div className="fw-semibold text-dark">
                          {new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-secondary small d-flex align-items-center gap-1">
                          <Clock size={12} /> {v.time}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center bg-light" style={{ width: 28, height: 28 }}>
                            <User size={14} className="text-secondary" />
                          </div>
                          <div className="fw-semibold text-dark">{v.doctorName || 'Assigned Doctor'}</div>
                        </div>
                      </td>
                      <td>
                        <span className="badge rounded-pill" style={{
                          backgroundColor: v.status === 'COMPLETED' ? '#d1fae5' : v.status === 'CANCELLED' ? '#fee2e2' : '#eff6ff',
                          color: v.status === 'COMPLETED' ? '#065f46' : v.status === 'CANCELLED' ? '#991b1b' : '#1e40af',
                          border: `1px solid ${v.status === 'COMPLETED' ? '#a7f3d0' : v.status === 'CANCELLED' ? '#fecaca' : '#bfdbfe'}`,
                          fontWeight: 600
                        }}>
                          {v.status || 'BOOKED'}
                        </span>
                      </td>
                      <td>
                        <div className="text-dark">{v.reason || 'Consultation'}</div>
                      </td>
                      <td>
                        {v.followUpDate ? (
                          <div className="d-flex align-items-center gap-1">
                            <CalendarCheck size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                            <span className="fw-semibold" style={{
                              color: new Date(v.followUpDate) < new Date() ? '#dc2626' : '#15803d',
                              fontSize: '0.82rem'
                            }}>
                              {new Date(v.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {new Date(v.followUpDate) < new Date() && (
                                <span className="ms-1 badge" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.65rem' }}>Overdue</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td className="text-end" style={{ paddingRight: 24 }}>
                        <button className="btn btn-sm rounded-pill d-inline-flex align-items-center gap-1" style={{ color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: 600 }}>
                          <FileText size={14} /> View Rx
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between p-3 text-muted small" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <span>Showing {visits.length} visit(s)</span>
              <span>End of List</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitsTab;
