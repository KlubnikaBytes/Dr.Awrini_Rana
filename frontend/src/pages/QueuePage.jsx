import React, { useState, useEffect, useCallback } from 'react';
import frontdeskService from '../services/frontdeskService';
import adminService from '../services/adminService';
import useWebSocket from '../hooks/useWebSocket';
import useSessionState from '../hooks/useSessionState';
import { getLocalDateString } from '../utils/dateUtils';
import { CalendarDays, RefreshCw, Clock, CheckCircle2, ChevronDown, Users } from 'lucide-react';

const STATUS_COLORS = {
  'BOOKED':   { bg: '#eff6ff', color: '#1d4ed8', dot: '#2563eb' },
  'ARRIVED':  { bg: '#f0fdf4', color: '#15803d', dot: '#16a34a' },
  'ON-GOING': { bg: '#fffbeb', color: '#b45309', dot: '#d97706' },
  'REVIEWED': { bg: '#f5f3ff', color: '#6d28d9', dot: '#7c3aed' },
  'CANCELLED':{ bg: '#fef2f2', color: '#b91c1c', dot: '#dc2626' },
};

const QueuePage = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [selectedDate, setSelectedDate] = useSessionState('queue_date', getLocalDateString());
  const [selectedDoc, setSelectedDoc]   = useSessionState('queue_doctor', 'ALL');
  const [syncing, setSyncing]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch doctors
  useEffect(() => {
    adminService.getStaff().then(staff => {
      setDoctors((staff || []).filter(s => s.role === 'Doctor'));
    }).catch(() => {});
  }, []);

  const fetchAppointments = useCallback(async (showSync = false) => {
    if (showSync) setSyncing(true);
    else setLoading(true);
    try {
      const data = await frontdeskService.getAppointments({ date: selectedDate });
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useWebSocket({
    APPOINTMENT_CREATED:        () => fetchAppointments(true),
    APPOINTMENT_STATUS_CHANGED: () => fetchAppointments(true),
    APPOINTMENT_UPDATED:        () => fetchAppointments(true),
    VITALS_UPDATED:             () => fetchAppointments(true),
  });

  // Group doctors by specialization
  const doctorsBySpec = doctors.reduce((acc, d) => {
    const spec = d.speciality || d.department || 'General';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(d);
    return acc;
  }, {});

  // Determine which doctors to show columns for
  const activeDoctors = selectedDoc === 'ALL'
    ? doctors
    : doctors.filter(d => d.name.toLowerCase().replace(/^dr\.?\s*/i, '').trim() ===
        selectedDoc.toLowerCase().replace(/^dr\.?\s*/i, '').trim());

  // Filter appointments per doctor
  const getDocAppts = (docName) => {
    const clean = docName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
    return appointments
      .filter(a => (a.doctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim() === clean)
      .filter(a => a.status !== 'CANCELLED')
      .sort((a, b) => {
        const aReviewed = a.status === 'REVIEWED' ? 1 : 0;
        const bReviewed = b.status === 'REVIEWED' ? 1 : 0;
        if (aReviewed !== bReviewed) return aReviewed - bReviewed;
        const qA = a.queueNumber ?? 9999;
        const qB = b.queueNumber ?? 9999;
        if (qA !== qB) return qA - qB;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  };

  const selLabel = selectedDoc === 'ALL'
    ? 'All Doctors'
    : `Dr. ${selectedDoc.replace(/^dr\.?\s*/i, '').trim()}`;

  const totalPending   = appointments.filter(a => a.status !== 'REVIEWED' && a.status !== 'CANCELLED').length;
  const totalCompleted = appointments.filter(a => a.status === 'REVIEWED').length;

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 56px)', background: '#f0f4f8' }}>

      {/* ── Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
      }}>
        <div className="d-flex align-items-center gap-2">
          <Users size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Patient Queue</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <Clock size={12} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>{totalPending} pending</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <CheckCircle2 size={12} style={{ color: '#4ade80' }} />
          <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700 }}>{totalCompleted} completed</span>
        </div>
        {syncing && (
          <div className="d-flex align-items-center gap-1 ms-auto">
            <RefreshCw size={11} className="spin" style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Live Syncing…</span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>

        {/* Doctor selector */}
        <div className="position-relative" style={{ zIndex: 300 }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${selectedDoc !== 'ALL' ? '#2563eb' : '#e2e8f0'}`,
              background: selectedDoc !== 'ALL' ? '#eff6ff' : '#f8fafc',
              color: selectedDoc !== 'ALL' ? '#1d4ed8' : '#475569',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7, outline: 'none'
            }}
          >
            👨‍⚕️ {selLabel}
            <ChevronDown size={13} />
          </button>
          {dropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setDropdownOpen(false)} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                border: '1px solid #e2e8f0', minWidth: 230, zIndex: 300, overflow: 'hidden'
              }}>
                <div
                  onClick={() => { setSelectedDoc('ALL'); setDropdownOpen(false); }}
                  style={{
                    padding: '10px 16px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 700,
                    color: selectedDoc === 'ALL' ? '#2563eb' : '#374151',
                    background: selectedDoc === 'ALL' ? '#eff6ff' : '#fff',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  🏥 All Doctors
                </div>
                {Object.entries(doctorsBySpec).map(([spec, docs]) => (
                  <div key={spec}>
                    <div style={{
                      padding: '5px 16px 3px', fontSize: '0.68rem', fontWeight: 800,
                      color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em',
                      background: '#f8fafc'
                    }}>{spec}</div>
                    {docs.map(d => {
                      const clean = d.name.replace(/^dr\.?\s*/i, '').trim();
                      const isSel = selectedDoc.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === clean.toLowerCase();
                      return (
                        <div
                          key={d._id}
                          onClick={() => { setSelectedDoc(d.name); setDropdownOpen(false); }}
                          style={{
                            padding: '9px 16px 9px 24px', fontSize: '0.85rem', cursor: 'pointer',
                            fontWeight: isSel ? 700 : 500,
                            color: isSel ? '#2563eb' : '#374151',
                            background: isSel ? '#eff6ff' : '#fff',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff'; }}
                        >
                          Dr. {clean}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
          <CalendarDays size={14} style={{ color: '#94a3b8' }} />
          <input
            type="date"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', color: '#334155' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <button
          onClick={() => setSelectedDate(getLocalDateString())}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          Today
        </button>

        {loading && (
          <div className="d-flex align-items-center gap-1 ms-auto">
            <RefreshCw size={13} className="spin" style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '0.78rem', color: '#60a5fa' }}>Loading…</span>
          </div>
        )}
      </div>

      {/* ── Queue Columns ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeDoctors.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>👨‍⚕️</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>No doctors added yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Add doctors from Admin → Doctors</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minHeight: '100%' }}>
            {activeDoctors.map(doc => {
              const cleanName = doc.name.replace(/^dr\.?\s*/i, '').trim();
              const docAppts  = getDocAppts(doc.name);
              const pending   = docAppts.filter(a => a.status !== 'REVIEWED').length;
              const done      = docAppts.filter(a => a.status === 'REVIEWED').length;

              return (
                <div key={doc._id} style={{
                  minWidth: 280, maxWidth: 320, flex: '0 0 auto',
                  background: '#fff', borderRadius: 14,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0', overflow: 'hidden'
                }}>
                  {/* Doctor header */}
                  <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>Dr. {cleanName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: 2 }}>
                      {doc.speciality || doc.department || 'General'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                        ⏳ {pending} pending
                      </span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                        ✅ {done} done
                      </span>
                    </div>
                  </div>

                  {/* Patient list */}
                  <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                    {docAppts.length === 0 ? (
                      <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        No patients in queue
                      </div>
                    ) : (
                      docAppts.map((appt, idx) => {
                        const patient  = appt.patient || {};
                        const st       = STATUS_COLORS[appt.status] || { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' };
                        const tokenNum = idx + 1;
                        const name     = patient.name || 'Unknown';
                        const age      = patient.age ? `${patient.age}Y` : '';
                        const gender   = patient.gender?.charAt(0) || '';

                        return (
                          <div
                            key={appt._id}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex', alignItems: 'center', gap: 12,
                              background: appt.isPriority ? '#fff1f2' : (appt.status === 'ON-GOING' ? '#fffbeb' : '#fff'),
                              borderLeft: appt.isPriority ? '4px solid #ef4444' : '4px solid transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            {/* Queue number */}
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: appt.isPriority ? '#fee2e2' : (appt.status === 'REVIEWED' ? '#dcfce7' : appt.status === 'ON-GOING' ? '#fef3c7' : '#eff6ff'),
                              color: appt.isPriority ? '#b91c1c' : (appt.status === 'REVIEWED' ? '#15803d' : appt.status === 'ON-GOING' ? '#92400e' : '#1d4ed8'),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 900, fontSize: '0.85rem'
                            }}>
                              #{appt.queueNumber || tokenNum}
                            </div>

                            {/* Patient info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: appt.isPriority ? '#991b1b' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {name} {appt.isPriority && <span style={{fontSize:'0.65rem', padding:'2px 6px', background:'#ef4444', color:'white', borderRadius:4, marginLeft:6, verticalAlign:'middle'}}>VIP/Priority</span>}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                                {[age, gender].filter(Boolean).join(', ')}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>
                                {patient.patientId || ''} · {appt.service || ''}
                              </div>
                            </div>

                            {/* Status badge */}
                            <div style={{
                              flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                              padding: '3px 8px', borderRadius: 6,
                              background: st.bg, color: st.color
                            }}>
                              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: st.dot, marginRight: 4 }} />
                              {appt.status}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePage;
