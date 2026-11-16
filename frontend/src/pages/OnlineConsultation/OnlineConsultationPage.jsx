import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Calendar, Clock, Stethoscope, Search,
  RefreshCw, CheckCircle2, MessageCircle, ExternalLink, Plus,
  Copy, Check, Mail, Sparkles, ChevronDown
} from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import useWebSocket from '../../hooks/useWebSocket';
import { getLocalDateString } from '../../utils/dateUtils';
import NewAppointmentModal from '../../components/FrontDesk/NewAppointmentModal';

const STATUS_CONFIG = {
  'BOOKED':    { label: 'Scheduled',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'ARRIVED':   { label: 'Waiting',    bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  'ON-GOING':  { label: 'In Call',    bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  'REVIEWED':  { label: 'Completed',  bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
  'CANCELLED': { label: 'Cancelled',  bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

const normStatus = (s = '') => {
  const upper = String(s || 'BOOKED').trim().toUpperCase();
  if (upper === 'ONGOING' || upper === 'ON GOING') return 'ON-GOING';
  if (upper === 'BOOKED' || upper === 'ARRIVED' || upper === 'ON-GOING' || upper === 'REVIEWED' || upper === 'CANCELLED') {
    return upper;
  }
  if (upper.includes('CALL') || upper.includes('PROGRESS')) return 'ON-GOING';
  if (upper.includes('WAIT')) return 'ARRIVED';
  if (upper.includes('COMPLET') || upper.includes('DONE')) return 'REVIEWED';
  return 'BOOKED';
};

const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-');
  if (y && m && d) {
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dStr;
};

const cleanDoc = (name = '') => String(name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();

const isOnlineAppointment = (appt) => {
  if (!appt) return false;
  if (typeof appt === 'string') {
    const s = appt.toLowerCase();
    return s.includes('online') || s.includes('video') || s.includes('virtual') || s.includes('tele');
  }
  const directService = String(appt.service || '').toLowerCase();
  const serviceType = String(appt.serviceType || '').toLowerCase();
  const arrayServices = Array.isArray(appt.services)
    ? appt.services.map(s => (typeof s === 'string' ? s : (s.serviceName || s.name || s.service || ''))).join(' ').toLowerCase()
    : '';
  const billsServices = Array.isArray(appt.bills)
    ? appt.bills.flatMap(b => b.items || b.services || []).map(s => s.serviceName || s.name || '').join(' ').toLowerCase()
    : '';
  const billSummaryServices = Array.isArray(appt.billSummary?.items)
    ? appt.billSummary.items.map(s => s.serviceName || '').join(' ').toLowerCase()
    : '';

  const combined = `${directService} ${serviceType} ${arrayServices} ${billsServices} ${billSummaryServices}`;
  return (
    combined.includes('online') ||
    combined.includes('video') ||
    combined.includes('virtual') ||
    combined.includes('tele') ||
    Boolean(appt.isOnline)
  );
};

const OnlineConsultationPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedDoctor, setSelectedDoctor] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('online'); // 'online' or 'all'
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState(null);
  const [copiedApptId, setCopiedApptId] = useState(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-wrapper')) {
        setActiveStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Contact Prompts for missing Phone / Email
  const [phonePromptModal, setPhonePromptModal] = useState({ show: false, appt: null, phone: '' });
  const [emailPromptModal, setEmailPromptModal] = useState({ show: false, appt: null, email: '' });

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
      // Pass { date: selectedDate } as an object so Axios serializes it properly
      const data = await frontdeskService.getAppointments({ date: selectedDate });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching appointments for online consultation:', err);
      setAppointments([]);
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

  // Calculate pool of online appointments vs total consultations
  const onlineAppointments = appointments.filter(isOnlineAppointment);
  const otherConsultationsCount = appointments.length - onlineAppointments.length;

  // Filter appointments according to active scope & user filters
  const filteredList = appointments.filter(appt => {
    // Scope filter (online consultations vs all appointments)
    if (scopeFilter === 'online' && !isOnlineAppointment(appt)) {
      return false;
    }

    // Doctor filter
    if (selectedDoctor !== 'ALL') {
      const docClean = cleanDoc(appt.doctorName);
      const selClean = cleanDoc(selectedDoctor);
      if (docClean !== selClean) return false;
    }

    // Status filter
    const apptStatus = normStatus(appt.status);
    if (statusFilter === 'ALL') {
      if (apptStatus === 'CANCELLED') return false; // Hide cancelled by default
    } else if (apptStatus !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const patientName = (appt.patient?.name || '').toLowerCase();
      const patientPhone = (appt.patient?.phone || '').toLowerCase();
      const uhid = (appt.uhid || appt.patient?.patientId || '').toLowerCase();
      if (!patientName.includes(q) && !patientPhone.includes(q) && !uhid.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Stats calculation (based on active scope)
  const activePool = scopeFilter === 'online' ? onlineAppointments : appointments;
  const totalCount = activePool.filter(a => normStatus(a.status) !== 'CANCELLED').length;
  const completedCount = activePool.filter(a => normStatus(a.status) === 'REVIEWED').length;
  const inCallCount = activePool.filter(a => normStatus(a.status) === 'ON-GOING').length;
  const scheduledCount = activePool.filter(a => {
    const st = normStatus(a.status);
    return st === 'BOOKED' || st === 'ARRIVED';
  }).length;

  const handleStartCall = (appt) => {
    setActiveCallModal(appt);
  };

  // In-House native WebRTC video meeting room URL
  const getVideoMeetUrl = (appt, role = 'patient') => {
    const roleParam = role ? `?role=${role}` : '';
    return `${window.location.origin}/meet/${appt._id}${roleParam}`;
  };

  const handleCopyMeetLink = (appt, e) => {
    e?.stopPropagation();
    const url = getVideoMeetUrl(appt, 'patient');
    navigator.clipboard?.writeText(url);
    setCopiedApptId(appt._id);
    setTimeout(() => setCopiedApptId(null), 2500);
  };

  // Send link via WhatsApp
  const handleSendWhatsAppLink = (appt, phoneOverride = null) => {
    let phone = phoneOverride || appt.patient?.phone || '';
    if (!phone) {
      setPhonePromptModal({ show: true, appt, phone: '' });
      return;
    }
    phone = String(phone).replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    const patientName = appt.patient?.name || 'Patient';
    const docName = appt.doctorName ? `Dr. ${appt.doctorName.replace(/^dr\.?\s*/i, '')}` : 'our Doctor';
    const dateStr = formatDisplayDate(selectedDate) || 'Today';
    const timeStr = appt.time ? `at ${appt.time}` : '';
    const meetUrl = getVideoMeetUrl(appt, 'patient');

    const text = encodeURIComponent(
      `Hello ${patientName},\n\nYour Online Video Consultation with ${docName} is scheduled for ${dateStr} ${timeStr}.\n\n🎥 Join Video Room Link:\n${meetUrl}\n\nPlease click the link above at your scheduled time to connect with the doctor.\n\nThank you,\n${localStorage.getItem('clinicName') || 'Clinic'}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Send link via Email
  const handleSendEmailLink = (appt, emailOverride = null) => {
    let email = emailOverride || appt.patient?.email || '';
    if (!email) {
      setEmailPromptModal({ show: true, appt, email: '' });
      return;
    }

    const patientName = appt.patient?.name || 'Patient';
    const docName = appt.doctorName ? `Dr. ${appt.doctorName.replace(/^dr\.?\s*/i, '')}` : 'our Doctor';
    const dateStr = formatDisplayDate(selectedDate) || 'Today';
    const timeStr = appt.time ? `at ${appt.time}` : '';
    const meetUrl = getVideoMeetUrl(appt, 'patient');
    const clinicName = localStorage.getItem('clinicName') || 'Mediplix Clinic';

    const subject = encodeURIComponent(`Online Video Consultation Link - ${patientName} with ${docName}`);
    const body = encodeURIComponent(
      `Hello ${patientName},\n\nYour Online Video Consultation with ${docName} is scheduled for ${dateStr} ${timeStr}.\n\n🎥 Click here to join your consultation room:\n${meetUrl}\n\nPlease join 5 minutes before your scheduled appointment.\n\nWarm regards,\n${clinicName}`
    );

    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Save phone number and immediately dispatch WhatsApp
  const handleSavePhoneAndSend = async () => {
    if (!phonePromptModal.phone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }
    const appt = phonePromptModal.appt;
    const phoneVal = phonePromptModal.phone.trim();
    try {
      const pId = appt.patient?._id;
      if (pId) {
        await frontdeskService.updatePatient(pId, { phone: phoneVal });
      }
      handleSendWhatsAppLink(appt, phoneVal);
      setPhonePromptModal({ show: false, appt: null, phone: '' });
      fetchConsultations();
    } catch (err) {
      console.warn('Failed to update phone on record, proceeding with WhatsApp:', err);
      handleSendWhatsAppLink(appt, phoneVal);
      setPhonePromptModal({ show: false, appt: null, phone: '' });
    }
  };

  // Save email and immediately dispatch Email
  const handleSaveEmailAndSend = async () => {
    if (!emailPromptModal.email.trim()) {
      alert('Please enter a valid email address');
      return;
    }
    const appt = emailPromptModal.appt;
    const emailVal = emailPromptModal.email.trim();
    try {
      const pId = appt.patient?._id;
      if (pId) {
        await frontdeskService.updatePatient(pId, { email: emailVal });
      }
      handleSendEmailLink(appt, emailVal);
      setEmailPromptModal({ show: false, appt: null, email: '' });
      fetchConsultations();
    } catch (err) {
      console.warn('Failed to update email on record, proceeding with email:', err);
      handleSendEmailLink(appt, emailVal);
      setEmailPromptModal({ show: false, appt: null, email: '' });
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    setActiveStatusDropdownId(null);
    try {
      await frontdeskService.updateAppointmentStatus(apptId, newStatus);
      fetchConsultations();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="d-flex flex-column h-100 bg-light" style={{ overflowY: 'auto' }}>
      {/* Top Banner / Header */}
      <div className="bg-white border-bottom px-3 px-md-4 py-3 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm flex-shrink-0"
              style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <Video size={22} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0 text-dark">Online Consultation</h5>
                <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  <Sparkles size={11} /> In-House Telehealth
                </span>
              </div>
              <div className="text-secondary small mt-0">
                Manage virtual appointments, launch WebRTC video consultations with live Visit Pad split screen
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
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
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top">
          {/* Left filters: Date, Doctor, Scope & Status */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
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

            {/* Scope: Online Only vs All */}
            <div className="d-flex align-items-center bg-white border rounded-pill p-1 shadow-sm">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0 border-0 ${scopeFilter === 'online' ? 'btn-success text-white' : 'btn-light text-secondary'}`}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  ...(scopeFilter === 'online' ? { background: '#059669' } : {})
                }}
                onClick={() => setScopeFilter('online')}
              >
                Online ({onlineAppointments.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0 border-0 ${scopeFilter === 'all' ? 'btn-secondary text-white' : 'btn-light text-secondary'}`}
                style={{ fontSize: '0.78rem', fontWeight: 600 }}
                onClick={() => setScopeFilter('all')}
                title="View all appointments for this date"
              >
                All ({appointments.length})
              </button>
            </div>

            {/* Status Pills */}
            <div className="d-flex flex-wrap gap-1">
              {['ALL', 'BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED', 'CANCELLED'].map(st => {
                const isSelected = statusFilter === st;
                return (
                  <button
                    key={st}
                    className={`btn btn-sm rounded-pill px-2 py-1 ${isSelected ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      ...(isSelected ? { background: '#059669', borderColor: '#059669' } : {})
                    }}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'ALL' ? 'All Status' : (STATUS_CONFIG[st]?.label || st)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Search box */}
          <div className="d-flex align-items-center bg-white border rounded-pill px-3 py-1.5 shadow-sm flex-grow-1 mt-2 mt-md-0" style={{ minWidth: '200px', maxWidth: '360px' }}>
            <Search size={14} className="text-muted me-2 flex-shrink-0" />
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
      <div className="px-3 px-md-4 py-3">
        <div className="row g-2 g-md-3">
          <div className="col-6 col-lg-3">
            <div className="bg-white rounded-3 p-2.5 p-md-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div className="min-w-0 me-2">
                <div className="text-secondary small fw-medium text-truncate">
                  {scopeFilter === 'online' ? 'Total Online' : 'Total Appts'}
                </div>
                <h4 className="fw-bold mb-0 text-dark mt-1 fs-5 fs-md-4">{totalCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-primary-subtle text-primary flex-shrink-0">
                <Video size={18} />
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="bg-white rounded-3 p-2.5 p-md-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div className="min-w-0 me-2">
                <div className="text-secondary small fw-medium text-truncate">Waiting</div>
                <h4 className="fw-bold mb-0 text-warning mt-1 fs-5 fs-md-4">{scheduledCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-warning-subtle text-warning flex-shrink-0">
                <Clock size={18} />
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="bg-white rounded-3 p-2.5 p-md-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div className="min-w-0 me-2">
                <div className="text-secondary small fw-medium text-truncate">In Call Now</div>
                <h4 className="fw-bold mb-0 text-success mt-1 fs-5 fs-md-4">{inCallCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-success-subtle text-success flex-shrink-0">
                <Video size={18} />
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="bg-white rounded-3 p-2.5 p-md-3 border shadow-sm d-flex align-items-center justify-content-between">
              <div className="min-w-0 me-2">
                <div className="text-secondary small fw-medium text-truncate">Completed</div>
                <h4 className="fw-bold mb-0 text-secondary mt-1 fs-5 fs-md-4">{completedCount}</h4>
              </div>
              <div className="rounded-circle p-2 bg-secondary-subtle text-secondary flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-3 px-md-4 pb-5 flex-grow-1">
        <div className="bg-white rounded-3 border shadow-sm position-relative">
          {loading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-success spinner-border-sm me-2" />
              Loading appointments...
            </div>
          ) : filteredList.length > 0 ? (
            <>
              {/* Desktop Table View (>= 992px) */}
              <div className="d-none d-lg-block table-responsive" style={{ minHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                  <thead className="table-light border-bottom text-secondary" style={{ fontSize: '0.78rem' }}>
                    <tr>
                      <th className="ps-4 py-3" style={{ width: '80px' }}>TOKEN</th>
                      <th className="py-3">PATIENT DETAILS</th>
                      <th className="py-3">DOCTOR</th>
                      <th className="py-3">SERVICE</th>
                      <th className="py-3">TIME</th>
                      <th className="py-3" style={{ minWidth: '130px' }}>STATUS</th>
                      <th className="pe-4 py-3 text-end" style={{ width: '280px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((appt, idx) => {
                      const mappedStatus = normStatus(appt.status);
                      const st = STATUS_CONFIG[mappedStatus] || STATUS_CONFIG['BOOKED'];
                      const patient = appt.patient || {};
                      const isOnline = isOnlineAppointment(appt);
                      const docDisplayName = appt.doctorName ? `Dr. ${appt.doctorName.replace(/^dr\.?\s*/i, '')}` : 'Not Assigned';
                      const isNearBottom = idx >= filteredList.length - 2 && filteredList.length > 2;

                      return (
                        <tr key={appt._id} className="border-bottom">
                          {/* Token / Queue Number */}
                          <td className="ps-4">
                            <span className="badge rounded-pill bg-light text-dark border px-2 py-1 fw-bold">
                              #{appt.queueNumber || '—'}
                            </span>
                          </td>

                          {/* Patient Info */}
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
                                  {patient.phone ? (
                                    <>
                                      <span>•</span>
                                      <span>📞 {patient.phone}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted fst-italic">• No phone</span>
                                  )}
                                  {patient.age ? <span>• {patient.age} Y</span> : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Doctor */}
                          <td>
                            <div className="fw-semibold text-dark">
                              {docDisplayName}
                            </div>
                            <div className="text-secondary small">{appt.speciality || (appt.doctorName ? 'General Medicine' : '—')}</div>
                          </td>

                          {/* Service Badge */}
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <span
                                className={`badge ${isOnline ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-secondary border'} px-2 py-1 text-truncate`}
                                style={{ maxWidth: '200px' }}
                                title={appt.service || appt.serviceType || 'Consultation'}
                              >
                                {appt.service || appt.serviceType || 'Consultation'}
                              </span>
                            </div>
                          </td>

                          {/* Time */}
                          <td>
                            <div className="d-flex align-items-center gap-1 text-dark">
                              <Clock size={13} className="text-muted" />
                              <span>{appt.time || '—'}</span>
                            </div>
                          </td>

                          {/* Status (with React custom dropdown - never cut off) */}
                          <td>
                            <div className="status-dropdown-wrapper position-relative d-inline-block">
                              <button
                                className="btn btn-sm rounded-pill px-2.5 py-1 border d-inline-flex align-items-center gap-1 shadow-sm"
                                type="button"
                                onClick={() => setActiveStatusDropdownId(prev => prev === appt._id ? null : appt._id)}
                                style={{
                                  backgroundColor: st.bg,
                                  color: st.color,
                                  borderColor: st.border,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <span>{st.label}</span>
                                <ChevronDown
                                  size={12}
                                  style={{
                                    transition: 'transform 0.2s',
                                    transform: activeStatusDropdownId === appt._id ? 'rotate(180deg)' : 'none'
                                  }}
                                />
                              </button>

                              {activeStatusDropdownId === appt._id && (
                                <div
                                  className="bg-white rounded-3 shadow-lg border p-1 text-start"
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    left: 'auto',
                                    top: isNearBottom ? 'auto' : 'calc(100% + 4px)',
                                    bottom: isNearBottom ? 'calc(100% + 4px)' : 'auto',
                                    minWidth: '160px',
                                    zIndex: 1050,
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                  }}
                                >
                                  {['BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED', 'CANCELLED'].map(sKey => {
                                    const cfg = STATUS_CONFIG[sKey] || {};
                                    const isSelected = mappedStatus === sKey;
                                    return (
                                      <button
                                        key={sKey}
                                        type="button"
                                        className={`dropdown-item w-100 py-1.5 px-3 rounded-2 d-flex align-items-center justify-content-between text-start small border-0 ${isSelected ? 'fw-bold bg-light text-success' : 'text-dark'}`}
                                        style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                        onClick={() => handleUpdateStatus(appt._id, sKey)}
                                      >
                                        <div className="d-flex align-items-center gap-2">
                                          <span
                                            className="rounded-circle d-inline-block"
                                            style={{ width: '8px', height: '8px', backgroundColor: cfg.color }}
                                          />
                                          <span>{cfg.label || sKey}</span>
                                        </div>
                                        {isSelected && <Check size={13} className="text-success ms-2" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="pe-4 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              {/* Start / Join In-House Video Call */}
                              <button
                                className="btn btn-sm btn-success d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm fw-medium"
                                style={{ background: '#059669', borderColor: '#059669' }}
                                onClick={() => handleStartCall(appt)}
                                title="Start Video Consultation"
                              >
                                <Video size={13} />
                                <span>{mappedStatus === 'ON-GOING' ? 'In Call' : 'Start Call'}</span>
                              </button>

                              {/* Copy Meeting Link */}
                              <button
                                className={`btn btn-sm ${copiedApptId === appt._id ? 'btn-success text-white' : 'btn-outline-secondary bg-white'} d-flex align-items-center justify-content-center rounded-circle p-1`}
                                style={{ width: '32px', height: '32px' }}
                                onClick={(e) => handleCopyMeetLink(appt, e)}
                                title={copiedApptId === appt._id ? 'Link Copied!' : 'Copy In-House Meeting Room Link'}
                              >
                                {copiedApptId === appt._id ? <Check size={14} /> : <Copy size={13} />}
                              </button>

                              {/* WhatsApp link */}
                              <button
                                className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center rounded-circle p-1"
                                style={{ width: '32px', height: '32px' }}
                                onClick={() => handleSendWhatsAppLink(appt)}
                                title="Send Video Link via WhatsApp"
                              >
                                <MessageCircle size={15} />
                              </button>

                              {/* Email link */}
                              <button
                                className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center rounded-circle p-1"
                                style={{ width: '32px', height: '32px' }}
                                onClick={() => handleSendEmailLink(appt)}
                                title="Send Video Link via Email"
                              >
                                <Mail size={15} />
                              </button>

                              {/* Open Visit Pad directly */}
                              <button
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center rounded-circle p-1"
                                style={{ width: '32px', height: '32px' }}
                                onClick={() => navigate(`/doctor/visit/${appt._id}`)}
                                title="Open Prescription / Visit Pad"
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

              {/* Mobile / Tablet Responsive Card List View (< 992px) */}
              <div className="d-block d-lg-none p-3">
                <div className="d-flex flex-column gap-3">
                  {filteredList.map((appt, idx) => {
                    const mappedStatus = normStatus(appt.status);
                    const st = STATUS_CONFIG[mappedStatus] || STATUS_CONFIG['BOOKED'];
                    const patient = appt.patient || {};
                    const isOnline = isOnlineAppointment(appt);
                    const docDisplayName = appt.doctorName ? `Dr. ${appt.doctorName.replace(/^dr\.?\s*/i, '')}` : 'Not Assigned';
                    const isCardNearBottom = idx >= filteredList.length - 1 && filteredList.length > 1;

                    return (
                      <div key={appt._id} className="bg-white rounded-3 border p-3 shadow-sm position-relative">
                        {/* Header Row: Token, Service, Status */}
                        <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge rounded-pill bg-light text-dark border px-2 py-1 fw-bold">
                              #{appt.queueNumber || '—'}
                            </span>
                            <span
                              className={`badge ${isOnline ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-secondary border'} px-2 py-1 text-truncate`}
                              style={{ maxWidth: '170px' }}
                              title={appt.service || appt.serviceType || 'Consultation'}
                            >
                              {appt.service || appt.serviceType || 'Consultation'}
                            </span>
                          </div>

                          {/* Quick Status Dropdown on Mobile */}
                          <div className="status-dropdown-wrapper position-relative">
                            <button
                              className="btn btn-sm rounded-pill px-2.5 py-1 border d-inline-flex align-items-center gap-1 shadow-sm"
                              type="button"
                              onClick={() => setActiveStatusDropdownId(prev => prev === appt._id ? null : appt._id)}
                              style={{
                                backgroundColor: st.bg,
                                color: st.color,
                                borderColor: st.border,
                                fontSize: '0.74rem',
                                fontWeight: 600
                              }}
                            >
                              <span>{st.label}</span>
                              <ChevronDown
                                size={11}
                                style={{
                                  transition: 'transform 0.2s',
                                  transform: activeStatusDropdownId === appt._id ? 'rotate(180deg)' : 'none'
                                }}
                              />
                            </button>

                            {activeStatusDropdownId === appt._id && (
                              <div
                                className="bg-white rounded-3 shadow-lg border p-1 text-start"
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  left: 'auto',
                                  top: isCardNearBottom ? 'auto' : 'calc(100% + 4px)',
                                  bottom: isCardNearBottom ? 'calc(100% + 4px)' : 'auto',
                                  minWidth: '150px',
                                  zIndex: 1050,
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                                }}
                              >
                                {['BOOKED', 'ARRIVED', 'ON-GOING', 'REVIEWED', 'CANCELLED'].map(sKey => {
                                  const cfg = STATUS_CONFIG[sKey] || {};
                                  const isSelected = mappedStatus === sKey;
                                  return (
                                    <button
                                      key={sKey}
                                      type="button"
                                      className={`dropdown-item w-100 py-1.5 px-3 rounded-2 d-flex align-items-center justify-content-between text-start small border-0 ${isSelected ? 'fw-bold bg-light text-success' : 'text-dark'}`}
                                      style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                      onClick={() => handleUpdateStatus(appt._id, sKey)}
                                    >
                                      <div className="d-flex align-items-center gap-2">
                                        <span
                                          className="rounded-circle d-inline-block"
                                          style={{ width: '8px', height: '8px', backgroundColor: cfg.color }}
                                        />
                                        <span>{cfg.label || sKey}</span>
                                      </div>
                                      {isSelected && <Check size={13} className="text-success ms-2" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Patient Details */}
                        <div className="d-flex align-items-center gap-3 mb-2.5">
                          <div
                            className="rounded-circle bg-light d-flex align-items-center justify-content-center text-secondary border flex-shrink-0"
                            style={{ width: '42px', height: '42px', fontSize: '0.95rem', fontWeight: 700 }}
                          >
                            {(patient.name || 'P')[0]?.toUpperCase()}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>
                              {patient.name || 'Unknown Patient'}
                            </div>
                            <div className="text-secondary small d-flex flex-wrap align-items-center gap-2 mt-0.5">
                              <span>{patient.patientId || appt.uhid || '—'}</span>
                              {patient.phone ? (
                                <>
                                  <span>•</span>
                                  <a href={`tel:${patient.phone}`} className="text-decoration-none text-secondary">
                                    📞 {patient.phone}
                                  </a>
                                </>
                              ) : (
                                <span className="text-muted fst-italic">• No phone</span>
                              )}
                              {patient.age ? <span>• {patient.age} Y</span> : null}
                            </div>
                          </div>
                        </div>

                        {/* Doctor & Time row */}
                        <div className="row g-2 mb-3 py-1.5 bg-light rounded-2 px-2 small">
                          <div className="col-7 d-flex align-items-center gap-1.5 text-truncate">
                            <Stethoscope size={13} className="text-muted flex-shrink-0" />
                            <span className="fw-semibold text-dark text-truncate">{docDisplayName}</span>
                          </div>
                          <div className="col-5 d-flex align-items-center justify-content-end gap-1 text-secondary">
                            <Clock size={13} className="text-muted flex-shrink-0" />
                            <span>{appt.time || '—'}</span>
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="d-flex align-items-center gap-2 pt-1 border-top">
                          {/* Primary Action Button: Start Call / In Call */}
                          <button
                            className="btn btn-sm btn-success flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 rounded-pill py-2 shadow-sm fw-semibold"
                            style={{ background: '#059669', borderColor: '#059669' }}
                            onClick={() => handleStartCall(appt)}
                          >
                            <Video size={15} />
                            <span>{mappedStatus === 'ON-GOING' ? 'In Call' : 'Start Call'}</span>
                          </button>

                          {/* Copy Meeting Link */}
                          <button
                            className={`btn btn-sm ${copiedApptId === appt._id ? 'btn-success text-white' : 'btn-outline-secondary bg-white'} d-flex align-items-center justify-content-center rounded-circle flex-shrink-0`}
                            style={{ width: '36px', height: '36px' }}
                            onClick={(e) => handleCopyMeetLink(appt, e)}
                            title={copiedApptId === appt._id ? 'Link Copied!' : 'Copy Meeting Link'}
                          >
                            {copiedApptId === appt._id ? <Check size={15} /> : <Copy size={14} />}
                          </button>

                          {/* WhatsApp */}
                          <button
                            className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-white"
                            style={{ width: '36px', height: '36px' }}
                            onClick={() => handleSendWhatsAppLink(appt)}
                            title="Send Link via WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>

                          {/* Email */}
                          <button
                            className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-white"
                            style={{ width: '36px', height: '36px' }}
                            onClick={() => handleSendEmailLink(appt)}
                            title="Send Link via Email"
                          >
                            <Mail size={16} />
                          </button>

                          {/* Visit Pad */}
                          <button
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-white"
                            style={{ width: '36px', height: '36px' }}
                            onClick={() => navigate(`/doctor/visit/${appt._id}`)}
                            title="Open Prescription / Visit Pad"
                          >
                            <ExternalLink size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 text-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '64px', height: '64px', background: '#ecfdf5', color: '#059669' }}
              >
                <Video size={32} />
              </div>
              <h5 className="fw-bold text-dark mb-1">
                {scopeFilter === 'online' ? 'No Online Consultations Found' : 'No Appointments Found'}
              </h5>
              <p className="text-secondary small mb-3" style={{ maxWidth: '440px', margin: '0 auto' }}>
                There are no scheduled online consultations for {formatDisplayDate(selectedDate) || 'this date'}.
                {otherConsultationsCount > 0 && scopeFilter === 'online' && (
                  <span className="d-block mt-2 text-dark fw-medium">
                    Found {otherConsultationsCount} regular appointment(s) for this day.
                  </span>
                )}
              </p>

              <div className="d-flex align-items-center justify-content-center gap-2">
                {otherConsultationsCount > 0 && scopeFilter === 'online' && (
                  <button
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-medium"
                    onClick={() => setScopeFilter('all')}
                  >
                    View All {appointments.length} Appointments
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-semibold"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Plus size={15} className="me-1" /> Schedule Online Consult
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Launch Video Call Modal */}
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
                    <h5 className="modal-title fw-bold text-dark mb-0">Launch Online Consultation</h5>
                    <div className="text-secondary small">
                      {activeCallModal.patient?.name} • {activeCallModal.doctorName ? `Dr. ${activeCallModal.doctorName.replace(/^dr\.?\s*/i, '')}` : 'General Consultation'}
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
                    <span className="fw-semibold text-dark">{activeCallModal.patient?.name || 'Unknown'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">UHID:</span>
                    <span className="fw-semibold text-dark">{activeCallModal.uhid || activeCallModal.patient?.patientId || '—'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Phone:</span>
                    <span className="fw-semibold text-dark">{activeCallModal.patient?.phone || '—'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Doctor:</span>
                    <span className="fw-semibold text-dark">
                      {activeCallModal.doctorName ? `Dr. ${activeCallModal.doctorName.replace(/^dr\.?\s*/i, '')}` : 'Not Assigned'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Service:</span>
                    <span className="fw-semibold text-success">{activeCallModal.service || 'ONLINE CONSULTATION'}</span>
                  </div>
                </div>

                {/* Direct In-House Meeting Room Link Box (Copy Section) */}
                <div className="border rounded-3 p-2 bg-white mb-3 d-flex align-items-center justify-content-between">
                  <div className="small text-truncate me-2 font-monospace text-muted" style={{ fontSize: '0.78rem' }}>
                    {getVideoMeetUrl(activeCallModal, 'patient')}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-3 py-1 flex-shrink-0"
                    style={{ fontSize: '0.75rem' }}
                    onClick={(e) => handleCopyMeetLink(activeCallModal, e)}
                  >
                    {copiedApptId === activeCallModal._id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    <span>{copiedApptId === activeCallModal._id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="d-flex flex-column gap-2">
                  {/* Join In-House WebRTC Meeting Room */}
                  <button
                    className="btn btn-success d-flex align-items-center justify-content-between p-3 rounded-3 text-start shadow-sm"
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => {
                      if (normStatus(activeCallModal.status) === 'BOOKED' || normStatus(activeCallModal.status) === 'ARRIVED') {
                        handleUpdateStatus(activeCallModal._id, 'ON-GOING');
                      }
                      window.open(getVideoMeetUrl(activeCallModal, 'doctor'), '_blank');
                    }}
                  >
                    <div>
                      <div className="fw-bold text-white d-flex align-items-center gap-2">
                        <span>Join Video Consultation Room</span>
                        <span className="badge bg-white text-success" style={{ fontSize: '0.7rem' }}>In-House</span>
                      </div>
                      <div className="small text-white-50">WebSockets & WebRTC with live Visit Pad split screen</div>
                    </div>
                    <Video size={18} className="text-white" />
                  </button>

                  {/* 1. Send Link via WhatsApp */}
                  <button
                    className="btn btn-outline-success d-flex align-items-center justify-content-between p-3 rounded-3 text-start"
                    onClick={() => handleSendWhatsAppLink(activeCallModal)}
                  >
                    <div>
                      <div className="fw-bold">1. Send Meeting Link via WhatsApp</div>
                      <div className="small text-muted">
                        {activeCallModal.patient?.phone
                          ? `Send directly to ${activeCallModal.patient.phone}`
                          : 'Phone not given — will prompt to enter'}
                      </div>
                    </div>
                    <MessageCircle size={18} />
                  </button>

                  {/* 2. Send Link via Email */}
                  <button
                    className="btn btn-outline-primary d-flex align-items-center justify-content-between p-3 rounded-3 text-start"
                    onClick={() => handleSendEmailLink(activeCallModal)}
                  >
                    <div>
                      <div className="fw-bold">2. Send Meeting Link via Email</div>
                      <div className="small text-muted">
                        {activeCallModal.patient?.email
                          ? `Send directly to ${activeCallModal.patient.email}`
                          : 'Email not given — will prompt to enter'}
                      </div>
                    </div>
                    <Mail size={18} />
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
                      <div className="small text-muted">Review clinical records and prescription history</div>
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

      {/* Prompt Modal for Missing Phone (WhatsApp) */}
      {phonePromptModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <MessageCircle size={20} className="text-success" />
                  <h6 className="fw-bold mb-0">Enter WhatsApp Number</h6>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPhonePromptModal({ show: false, appt: null, phone: '' })}
                />
              </div>

              <p className="text-secondary small mb-3">
                Phone number is not on record for{' '}
                <span className="fw-semibold text-dark">{phonePromptModal.appt?.patient?.name || 'patient'}</span>.
                Please enter their mobile/WhatsApp number:
              </p>

              <input
                type="tel"
                className="form-control rounded-3 mb-3"
                placeholder="e.g. 9876543210"
                autoFocus
                value={phonePromptModal.phone}
                onChange={e => setPhonePromptModal(prev => ({ ...prev, phone: e.target.value }))}
              />

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-3"
                  onClick={() => setPhonePromptModal({ show: false, appt: null, phone: '' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success rounded-pill px-4 fw-semibold"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={handleSavePhoneAndSend}
                >
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal for Missing Email */}
      {emailPromptModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Mail size={20} className="text-primary" />
                  <h6 className="fw-bold mb-0">Enter Email Address</h6>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEmailPromptModal({ show: false, appt: null, email: '' })}
                />
              </div>

              <p className="text-secondary small mb-3">
                Email address is not on record for{' '}
                <span className="fw-semibold text-dark">{emailPromptModal.appt?.patient?.name || 'patient'}</span>.
                Please enter their email:
              </p>

              <input
                type="email"
                className="form-control rounded-3 mb-3"
                placeholder="patient@example.com"
                autoFocus
                value={emailPromptModal.email}
                onChange={e => setEmailPromptModal(prev => ({ ...prev, email: e.target.value }))}
              />

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-3"
                  onClick={() => setEmailPromptModal({ show: false, appt: null, email: '' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 fw-semibold"
                  onClick={handleSaveEmailAndSend}
                >
                  Send Email
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
          editData={{
            service: 'ONLINE CONSULTATION',
            serviceType: 'Consultation',
            date: selectedDate
          }}
        />
      )}
    </div>
  );
};

export default OnlineConsultationPage;
