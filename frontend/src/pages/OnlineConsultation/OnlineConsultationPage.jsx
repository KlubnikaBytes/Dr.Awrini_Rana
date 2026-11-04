import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Calendar, Clock, User, Phone, Stethoscope, Search,
  RefreshCw, CheckCircle2, MessageCircle, ExternalLink, Plus, Filter, AlertCircle
} from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import useWebSocket from '../../hooks/useWebSocket';
import { getLocalDateString } from '../../utils/dateUtils';
import NewAppointmentModal from '../../components/FrontDesk/NewAppointmentModal';

const STATUS_CONFIG = {
  'BOOKED':   { label: 'Scheduled',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'ARRIVED':  { label: 'Waiting',    bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  'ON-GOING': { label: 'In Call',    bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  'REVIEWED': { label: 'Completed',  bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
  'CANCELLED':{ label: 'Cancelled',  bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

const OnlineConsultationPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedDoctor, setSelectedDoctor] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      const staffList = await adminService.getStaff();
      const docs = (staffList || []).filter(s => s.role === 'Doctor' || s.isDoctor);
      setDoctors(docs);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  }, []);

  const fetchConsultations = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await frontdeskService.getAppointments(selectedDate);
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Real-time WebSocket sync
  useWebSocket({
    APPOINTMENT_UPDATED: () => fetchConsultations(),
    APPOINTMENT_DELETED: () => fetchConsultations(),
    APPOINTMENTS_SYNC:   () => fetchConsultations(),
  });

  // Filter for Online Consultations (or all virtual appointments)
  const isOnlineService = (serviceName = '') => {
    const s = String(serviceName).toLowerCase();
    return s.includes('online') || s.includes('video') || s.includes('virtual') || s.includes('tele');
  };

  // Appointments matching criteria
  const filteredList = appointments.filter(appt => {
    // Service check: show online consultations primarily, or if none exist for date, show consultations
    const matchesService = isOnlineService(appt.service);
    
    // Doctor filter
    const matchesDoc = selectedDoctor === 'ALL' || appt.doctorName === selectedDoctor;
    
    // Status filter
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    
    // Search query
    const patientName = (appt.patient?.name || '').toLowerCase();
    const patientPhone = (appt.patient?.phone || '').toLowerCase();
    const uhid = (appt.uhid || appt.patient?.patientId || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || patientName.includes(q) || patientPhone.includes(q) || uhid.includes(q);

    return matchesService && matchesDoc && matchesStatus && matchesSearch;
  });

  // Fallback: if no appointments specifically have 'online' in service name, let user toggle to view all consultations
  const allConsultationsCount = appointments.filter(a => isOnlineService(a.service)).length;

  // Stats calculation
  const totalCount = filteredList.length;
  const completedCount = filteredList.filter(a => a.status === 'REVIEWED').length;
  const inCallCount = filteredList.filter(a => a.status === 'ON-GOING').length;
  const scheduledCount = filteredList.filter(a => a.status === 'BOOKED' || a.status === 'ARRIVED').length;

  const handleStartCall = (appt) => {
    setActiveCallModal(appt);
  };

  const handleSendWhatsAppLink = (appt) => {
    let phone = appt.patient?.phone || '';
    if (!phone) {
      alert('Patient phone number not found');
      return;
    }
    if (phone.length === 10) phone = '91' + phone;

    const patientName = appt.patient?.name || 'Patient';
    const docName = appt.doctorName || 'Doctor';
    const dateStr = appt.date ? new Date(appt.date).toLocaleDateString('en-IN') : 'Today';
    const timeStr = appt.time || '';

    const text = encodeURIComponent(
      `Hello ${patientName},\n\nYour Online Consultation with Dr. ${docName.replace(/^dr\.?\s*/i, '')} is scheduled for ${dateStr} ${timeStr ? 'at ' + timeStr : ''}.\n\nPlease be ready for your video consultation. Our clinic will connect with you shortly.\n\nThank you,\n${localStorage.getItem('clinicName') || 'Clinic'}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="d-flex flex-column h-100 bg-light" style={{ overflowY: 'auto' }}>
      {/* Top Banner / Header */}
      <div className="bg-white border-bottom px-4 py-3 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm"
              style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <Video size={22} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0 text-dark">Online Consultation</h5>
                <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: '0.72rem' }}>
                  Live Telehealth
                </span>
              </div>
              <div className="text-secondary small mt-0">
                Manage virtual appointments, start video consultations, and send meeting links
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill px-3 bg-white"
              onClick={fetchConsultations}
              disabled={refreshing}
              title="Refresh consultations"
            >
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm fw-semibold"
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={() => setShowScheduleModal(true)}
            >
              <Plus size={15} />
              <span>Schedule Online Consult</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 pt-3 border-top">
          {/* Left filters: Date, Doctor, Status */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Date picker */}
            <div className="d-flex align-items-center gap-1 bg-white border rounded-pill px-3 py-1 shadow-sm">
              <Calendar size={13} className="text-muted" />
              <input
                type="date"
                className="border-0 bg-transparent shadow-none small text-dark fw-medium"
                style={{ outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Doctor Filter */}
            <div className="d-flex align-items-center gap-1 bg-white border rounded-pill px-3 py-1 shadow-sm">
              <Stethoscope size={13} className="text-muted" />
              <select
                className="border-0 bg-transparent shadow-none small text-dark fw-medium"
                style={{ outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
              >
                <option value="ALL">All Doctors</option>
                {doctors.map(d => (
                  <option key={d._id || d.name} value={d.name}>
                    Dr. {d.name.replace(/^dr\.?\s*/i, '')} {d.speciality ? `(${d.speciality})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="d-flex gap-1 ms-1">
              {['ALL', 'BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED'].map(st => (
                <button
                  key={st}
                  className={`btn btn-sm rounded-pill px-3 py-1 ${statusFilter === st ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    ...(statusFilter === st ? { background: '#059669', borderColor: '#059669' } : {})
                  }}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'All' : (STATUS_CONFIG[st]?.label || st)}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Search box */}
          <div className="d-flex align-items-center bg-white border rounded-pill px-3 py-1 shadow-sm" style={{ minWidth: '220px' }}>
            <Search size={14} className="text-muted me-2" />
            <input
              type="text"
              placeholder="Search patient, phone, UHID..."
              className="border-0 bg-transparent shadow-none w-100 small"
              style={{ outline: 'none', fontSize: '0.85rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="px-4 py-3">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="bg-white rounded-3 p-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium">Total Online</div>
                <h4 className="fw-bold mb-0 text-dark mt-1">{totalCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-primary-subtle text-primary">
                <Video size={20} />
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="bg-white rounded-3 p-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium">Scheduled / Waiting</div>
                <h4 className="fw-bold mb-0 text-warning mt-1">{scheduledCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-warning-subtle text-warning">
                <Clock size={20} />
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="bg-white rounded-3 p-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium">In Call Now</div>
                <h4 className="fw-bold mb-0 text-success mt-1">{inCallCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-success-subtle text-success">
                <Video size={20} />
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="bg-white rounded-3 p-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium">Completed</div>
                <h4 className="fw-bold mb-0 text-secondary mt-1">{completedCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-secondary-subtle text-secondary">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 pb-5 flex-grow-1">
        <div className="bg-white rounded-3 border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-success spinner-border-sm me-2" />
              Loading online consultations...
            </div>
          ) : filteredList.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                <thead className="table-light border-bottom text-secondary" style={{ fontSize: '0.78rem' }}>
                  <tr>
                    <th className="ps-4 py-3" style={{ width: '80px' }}>TOKEN</th>
                    <th className="py-3">PATIENT DETAILS</th>
                    <th className="py-3">DOCTOR</th>
                    <th className="py-3">SERVICE</th>
                    <th className="py-3">SCHEDULED TIME</th>
                    <th className="py-3">STATUS</th>
                    <th className="pe-4 py-3 text-end" style={{ width: '220px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(appt => {
                    const st = STATUS_CONFIG[appt.status] || STATUS_CONFIG['BOOKED'];
                    const patient = appt.patient || {};
                    const isUpcoming = appt.status === 'BOOKED' || appt.status === 'ARRIVED';

                    return (
                      <tr key={appt._id} className="border-bottom">
                        {/* Token / Q number */}
                        <td className="ps-4">
                          <span className="badge rounded-pill bg-light text-dark border px-2 py-1 fw-bold">
                            #{appt.queueNumber || '—'}
                          </span>
                        </td>

                        {/* Patient info */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-light d-flex align-items-center justify-content-center text-secondary border flex-shrink-0"
                              style={{ width: '34px', height: '34px', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              {(patient.name || 'P')[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{patient.name || 'Unknown Patient'}</div>
                              <div className="text-secondary small d-flex align-items-center gap-2">
                                <span>{patient.patientId || appt.uhid || '—'}</span>
                                {patient.phone && (
                                  <>
                                    <span>•</span>
                                    <span>📞 {patient.phone}</span>
                                  </>
                                )}
                                {patient.age ? <span>• {patient.age} Y</span> : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td>
                          <div className="fw-semibold text-dark">
                            Dr. {(appt.doctorName || '').replace(/^dr\.?\s*/i, '')}
                          </div>
                          <div className="text-secondary small">{appt.speciality || 'General Medicine'}</div>
                        </td>

                        {/* Service */}
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            {appt.service || 'Online Consultation'}
                          </span>
                        </td>

                        {/* Time */}
                        <td>
                          <div className="d-flex align-items-center gap-1 text-dark">
                            <Clock size={13} className="text-muted" />
                            <span>{appt.time || '—'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="badge rounded-pill px-2 py-1"
                            style={{
                              backgroundColor: st.bg,
                              color: st.color,
                              border: `1px solid ${st.border}`,
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {st.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="pe-4 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            {/* Start / Join Video Call */}
                            <button
                              className="btn btn-sm btn-success d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm fw-medium"
                              style={{ background: '#059669', borderColor: '#059669' }}
                              onClick={() => handleStartCall(appt)}
                              title="Start Video Consultation"
                            >
                              <Video size={13} />
                              <span>{appt.status === 'ON-GOING' ? 'In Call' : 'Start Call'}</span>
                            </button>

                            {/* WhatsApp link */}
                            <button
                              className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center rounded-circle p-1"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => handleSendWhatsAppLink(appt)}
                              title="Send details via WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>

                            {/* Open Visit Pad */}
                            <button
                              className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center rounded-circle p-1"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => navigate(`/doctor/visit/${appt._id}`)}
                              title="Open Prescription Pad"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '64px', height: '64px', background: '#ecfdf5', color: '#059669' }}
              >
                <Video size={32} />
              </div>
              <h5 className="fw-bold text-dark mb-1">No Online Consultations Found</h5>
              <p className="text-secondary small mb-3" style={{ maxWidth: '440px', margin: '0 auto' }}>
                There are no scheduled online consultations for {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
                You can schedule a new online consultation anytime.
              </p>
              <button
                className="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-semibold"
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={() => setShowScheduleModal(true)}
              >
                <Plus size={15} className="me-1" /> Schedule Online Consult
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      {activeCallModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                    style={{ width: '42px', height: '42px', background: '#059669' }}
                  >
                    <Video size={20} />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Start Online Consultation</h5>
                    <div className="text-secondary small">
                      {activeCallModal.patient?.name} with Dr. {activeCallModal.doctorName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setActiveCallModal(null)}
                />
              </div>

              <div className="modal-body p-4">
                <div className="bg-light rounded-3 p-3 border mb-3">
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Patient:</span>
                    <span className="fw-semibold text-dark">{activeCallModal.patient?.name}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Phone:</span>
                    <span className="fw-semibold text-dark">{activeCallModal.patient?.phone || '—'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Doctor:</span>
                    <span className="fw-semibold text-dark">Dr. {activeCallModal.doctorName}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Service:</span>
                    <span className="fw-semibold text-success">{activeCallModal.service}</span>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2">
                  {/* Google Meet / Jitsi option */}
                  <button
                    className="btn btn-outline-primary d-flex align-items-center justify-content-between p-3 rounded-3 text-start"
                    onClick={() => {
                      const meetUrl = `https://meet.jit.si/mediplix-${activeCallModal._id}`;
                      window.open(meetUrl, '_blank');
                      setActiveCallModal(null);
                    }}
                  >
                    <div>
                      <div className="fw-bold">Launch Video Room (Instant)</div>
                      <div className="small text-muted">Free, secure, in-browser video room</div>
                    </div>
                    <ExternalLink size={18} />
                  </button>

                  {/* Open Visit Pad directly */}
                  <button
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-between p-3 rounded-3 text-start"
                    onClick={() => {
                      navigate(`/doctor/visit/${activeCallModal._id}`);
                      setActiveCallModal(null);
                    }}
                  >
                    <div>
                      <div className="fw-bold">Open Prescription / Visit Pad</div>
                      <div className="small text-muted">Write prescription and review clinical notes</div>
                    </div>
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>

              <div className="modal-footer border-0 pt-0 px-4 pb-4">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-4"
                  onClick={() => setActiveCallModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Online Consultation Modal */}
      {showScheduleModal && (
        <NewAppointmentModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchConsultations();
          }}
          editData={{ service: 'ONLINE CONSULTATION' }}
        />
      )}
    </div>
  );
};

export default OnlineConsultationPage;
