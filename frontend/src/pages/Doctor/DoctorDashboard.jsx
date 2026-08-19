import React, { useState, useEffect, useCallback } from 'react';
import frontdeskService from '../../services/frontdeskService';
import { Search, RefreshCw, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
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
      // WS will trigger refresh automatically; optimistic update here too
      setAppointments(prev => prev.map(a => a._id === appointmentId ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  const pendingCount   = appointments.filter(a => a.status !== 'REVIEWED').length;
  const completedCount = appointments.filter(a => a.status === 'REVIEWED').length;

  const filteredAppointments = appointments.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (app.patient?.name?.toLowerCase() || '').includes(q) ||
      (app.patient?.patientId?.toLowerCase() || '').includes(q)
    );
  });

  const calculateWait = (status) => {
    if (status === 'REVIEWED' || status === 'BOOKED') return '—';
    return '~15m';
  };

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

        <div className="ms-auto d-flex align-items-center gap-2">
          {/* Date picker */}
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
              <th>Time</th>
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
              <tr><td colSpan={10} className="text-center py-5 text-secondary">
                <RefreshCw size={18} className="spin me-2" />Loading…
              </td></tr>
            ) : filteredAppointments.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-5">
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏥</div>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>No appointments for this date</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
                  Select a different date or check the Front Desk
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

                return (
                  <tr key={app._id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {patient.patientId || app._id?.slice(-5)}
                    </td>
                    <td>
                      <div className="token-badge">{index + 1}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{patientLabel}</td>
                    <td style={{ color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.82rem' }}>{app.time || '—'}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{calculateWait(app.status)}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{recentVisit}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        borderRadius: 99, padding: '2px 8px',
                        fontSize: '0.72rem', fontWeight: 700
                      }}>{visits}</span>
                    </td>
                    <td>
                      <div className="position-relative d-inline-block">
                        <span className={`status-badge ${st.cls} d-inline-flex align-items-center gap-1`} style={{ cursor:'pointer' }}>
                          {app.status}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </span>
                        <select
                          style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
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
