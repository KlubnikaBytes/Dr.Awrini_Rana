import React, { useState, useEffect, useCallback } from 'react';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import { Search, RefreshCw, CalendarDays, CheckCircle2, Clock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSessionState from '../../hooks/useSessionState';
import useWebSocket from '../../hooks/useWebSocket';
import { getLocalDateString } from '../../utils/dateUtils';

const STATUS_STYLES = {
  'BOOKED':   { cls: 'badge-booked',   accentColor: '#2563eb' },
  'ARRIVED':  { cls: 'badge-arrived',  accentColor: '#059669' },
  'ON-GOING': { cls: 'badge-ongoing',  accentColor: '#d97706' },
  'REVIEWED': { cls: 'badge-reviewed', accentColor: '#7c3aed' },
};

const DoctorDashboard = () => {
  const navigate  = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery]   = useSessionState('doctor_searchQuery', '');
  const [selectedDate, setSelectedDate] = useSessionState('doctor_selectedDate', getLocalDateString());
  const [loading, setLoading]           = useState(false);
  const [syncing, setSyncing]           = useState(false);

  // ── Doctor filter state ──────────────────────────────────────────
  const [doctors, setDoctors]               = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useSessionState('doctor_filter', 'ALL');
  const [dropdownOpen, setDropdownOpen]     = useState(false);

  // Fetch doctor list on mount
  useEffect(() => {
    adminService.getStaff().then(staff => {
      const docs = (staff || []).filter(s => s.role === 'Doctor');
      setDoctors(docs);
    }).catch(() => {});
  }, []);

  // Group doctors by specialization
  const doctorsBySpec = doctors.reduce((acc, d) => {
    const spec = d.speciality || d.department || 'General';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(d);
    return acc;
  }, {});

  const fetchAppointments = useCallback(async (showSync = false) => {
    if (showSync) setSyncing(true);
    else setLoading(true);
    try {
      const data = await frontdeskService.getAppointments({ date: selectedDate });
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Real-time WebSocket sync ────────────────────────────────────
  useWebSocket({
    APPOINTMENT_CREATED:        () => fetchAppointments(true),
    APPOINTMENT_STATUS_CHANGED: () => fetchAppointments(true),
    VITALS_UPDATED:             () => fetchAppointments(true),
    TEST_RESULTS_SAVED:         () => fetchAppointments(true),
    ATTACHMENT_UPLOADED:        () => fetchAppointments(true),
  });

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await frontdeskService.updateAppointmentStatus(appointmentId, newStatus);
      setAppointments(prev => prev.map(a => a._id === appointmentId ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  // ── Filtered list (doctor + search) ─────────────────────────────
  const filteredAppointments = appointments.filter(app => {
    if (selectedDoctor !== 'ALL') {
      const apptDoc = (app.doctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
      const selDoc  = selectedDoctor.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
      if (apptDoc !== selDoc) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (app.patient?.name?.toLowerCase() || '').includes(q) ||
        (app.patient?.patientId?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    const aReviewed = a.status === 'REVIEWED' ? 1 : 0;
    const bReviewed = b.status === 'REVIEWED' ? 1 : 0;
    if (aReviewed !== bReviewed) return aReviewed - bReviewed;
    const qA = a.queueNumber ?? 9999;
    const qB = b.queueNumber ?? 9999;
    if (qA !== qB) return qA - qB;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const pendingCount   = filteredAppointments.filter(a => a.status !== 'REVIEWED').length;
  const completedCount = filteredAppointments.filter(a => a.status === 'REVIEWED').length;

  const calculateWait = (status) => {
    if (status === 'REVIEWED' || status === 'BOOKED') return '—';
    return '~15m';
  };

  const selectedDoctorLabel = selectedDoctor === 'ALL'
    ? 'All Doctors'
    : `Dr. ${selectedDoctor.replace(/^dr\.?\s*/i, '').trim()}`;

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 56px)', background: 'var(--gray-100)' }}>

      {/* ── Stats Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
      }}>
        <div className="d-flex align-items-center gap-2">
          <Clock size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Today's Queue</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Pending:</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24' }}>{pendingCount}</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <CheckCircle2 size={13} style={{ color: '#4ade80' }} />
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Completed:</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>{completedCount}</span>
        </div>
        {selectedDoctor !== 'ALL' && (
          <div className="d-flex align-items-center gap-1">
            <span style={{ fontSize: '0.75rem', background: 'rgba(99,179,237,0.2)', color: '#63b3ed', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
              👨‍⚕️ {selectedDoctorLabel}
            </span>
          </div>
        )}
        {syncing && (
          <div className="d-flex align-items-center gap-1 ms-auto">
            <RefreshCw size={12} className="spin" style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '0.72rem', color: '#60a5fa' }}>Syncing…</span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="page-toolbar">
        {/* Search */}
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="hp-input form-control"
            placeholder="Search by name or ID…"
            style={{ width: 200, paddingLeft: 32 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ── Doctor Filter Dropdown ── */}
        <div className="position-relative" style={{ zIndex: 200 }}>
          <button
            id="doctor-filter-btn"
            className="d-flex align-items-center gap-2"
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)',
              background: selectedDoctor !== 'ALL' ? 'var(--primary-light)' : 'var(--gray-50)',
              color: selectedDoctor !== 'ALL' ? 'var(--primary)' : 'var(--gray-700)',
              fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', height: 32,
              whiteSpace: 'nowrap', outline: 'none'
            }}
          >
            👨‍⚕️ {selectedDoctorLabel}
            <ChevronDown size={13} />
          </button>

          {dropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid var(--gray-200)', minWidth: 220, zIndex: 200, overflow: 'hidden'
              }}>
                {/* All option */}
                <div
                  onClick={() => { setSelectedDoctor('ALL'); setDropdownOpen(false); }}
                  style={{
                    padding: '9px 14px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700,
                    color: selectedDoctor === 'ALL' ? 'var(--primary)' : 'var(--gray-700)',
                    background: selectedDoctor === 'ALL' ? 'var(--primary-light)' : 'transparent',
                    borderBottom: '1px solid var(--gray-100)'
                  }}
                >
                  🏥 All Doctors
                </div>
                {/* Grouped by specialization */}
                {Object.entries(doctorsBySpec).map(([spec, docs]) => (
                  <div key={spec}>
                    <div style={{
                      padding: '5px 14px 3px', fontSize: '0.68rem', fontWeight: 800,
                      color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: 'var(--gray-50)'
                    }}>
                      {spec}
                    </div>
                    {docs.map(d => {
                      const cleanName = d.name.replace(/^dr\.?\s*/i, '').trim();
                      const isSelected = selectedDoctor.toLowerCase().replace(/^dr\.?\s*/i, '').trim() === cleanName.toLowerCase();
                      return (
                        <div
                          key={d._id}
                          onClick={() => { setSelectedDoctor(d.name); setDropdownOpen(false); }}
                          style={{
                            padding: '8px 14px 8px 20px', fontSize: '0.83rem', cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--primary)' : 'var(--gray-700)',
                            background: isSelected ? 'var(--primary-light)' : 'transparent',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--gray-50)'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          Dr. {cleanName}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {doctors.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                    No doctors added yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ms-auto d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-1" style={{
            padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--gray-200)',
            background: 'var(--gray-50)', height: 32
          }}>
            <CalendarDays size={13} style={{ color: 'var(--gray-400)' }} />
            <input
              type="date"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: 'var(--gray-800)' }}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          <button className="btn-hp-ghost" onClick={() => setSelectedDate(getLocalDateString())}>
            Today
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-grow-1 overflow-auto" style={{ background: '#fff' }}>
        <table className="hp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Token</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Q. No</th>
              <th>Wait</th>
              <th>Recent Visit</th>
              <th>Visits</th>
              <th>Status</th>
              <th>Action</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-5 text-secondary">
                <RefreshCw size={18} className="spin me-2" />Loading…
              </td></tr>
            ) : filteredAppointments.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-5">
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏥</div>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>No appointments for this selection</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
                  Try selecting a different doctor or date
                </div>
              </td></tr>
            ) : (
              filteredAppointments.map((app, index) => {
                const patient = app.patient || {};
                const st = STATUS_STYLES[app.status] || { cls: 'badge-default', accentColor: '#64748b' };
                const visits = app.pastVisitsCount || 0;
                let recentVisit = '—';
                if (app.recentVisitDate) {
                  const diffDays = Math.ceil(Math.abs(new Date() - new Date(app.recentVisitDate)) / (1000 * 60 * 60 * 24));
                  recentVisit = diffDays === 0 ? 'Today' : `${diffDays}d ago`;
                }
                const patientLabel = `${patient.name || 'Unknown'} (${patient.age || '—'}Y, ${patient.gender?.charAt(0) || '?'})`;
                const cleanDrName = (app.doctorName || '').replace(/^dr\.?\s*/i, '').trim();

                return (
                  <tr key={app._id} style={{ background: app.isPriority ? '#fff1f2' : 'transparent', borderLeft: app.isPriority ? '4px solid #ef4444' : '4px solid transparent' }}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {patient.patientId || app._id?.slice(-5)}
                    </td>
                    <td>
                      <div className="token-badge" style={{ background: app.isPriority ? '#fee2e2' : undefined, color: app.isPriority ? '#b91c1c' : undefined }}>
                        #{app.queueNumber || index + 1}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {patientLabel}
                      {app.isPriority && <span style={{fontSize:'0.65rem', padding:'2px 6px', background:'#ef4444', color:'white', borderRadius:4, marginLeft:6, verticalAlign:'middle'}}>VIP</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                      {cleanDrName ? `Dr. ${cleanDrName}` : '—'}
                    </td>
                    <td style={{ color: app.isPriority ? '#b91c1c' : 'var(--gray-500)', fontWeight: 700, fontSize: '0.82rem' }}>
                      #{app.queueNumber || index + 1}
                    </td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{calculateWait(app.status)}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{recentVisit}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700
                      }}>{visits}</span>
                    </td>
                    <td>
                      <div className="position-relative d-inline-block">
                        <span className={`status-badge ${st.cls} d-inline-flex align-items-center gap-1`} style={{ cursor: 'pointer' }}>
                          {app.status}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </span>
                        <select
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          value={app.status}
                          onChange={e => handleStatusChange(app._id, e.target.value)}
                          title="Change status"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="BOOKED">BOOKED</option>
                          <option value="ARRIVED">ARRIVED</option>
                          <option value="ON-GOING">ON-GOING</option>
                          <option value="REVIEWED">REVIEWED</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-hp-primary"
                        style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                        onClick={() => navigate(`/doctor/visit/${app._id}`)}
                      >
                        Visit Pad
                      </button>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.75rem', fontWeight: 500, maxWidth: 150, textTransform: 'uppercase' }}>
                      {app.service || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorDashboard;
