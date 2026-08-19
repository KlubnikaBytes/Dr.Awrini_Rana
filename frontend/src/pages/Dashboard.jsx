import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, CalendarIcon, Plus, ChevronDown, Stethoscope,
  FileText, Paperclip, Briefcase, PlusCircle, RefreshCw
} from 'lucide-react';
import frontdeskService from '../services/frontdeskService';
import useSessionState from '../hooks/useSessionState';
import useWebSocket from '../hooks/useWebSocket';
import NewAppointmentModal from '../components/FrontDesk/NewAppointmentModal';
import VitalsModal from '../components/FrontDesk/VitalsModal';
import TestResultModal from '../components/FrontDesk/TestResultModal';
import PrescriptionModal from '../components/FrontDesk/PrescriptionModal';
import AttachmentModal from '../components/FrontDesk/AttachmentModal';
import PatientDashboardModal from '../components/FrontDesk/PatientDashboard/PatientDashboardModal';
import { getLocalDateString } from '../utils/dateUtils';

const STATUS_STYLES = {
  'BOOKED':   { cls: 'badge-booked',   label: 'Booked' },
  'ARRIVED':  { cls: 'badge-arrived',  label: 'Arrived' },
  'ON-GOING': { cls: 'badge-ongoing',  label: 'On-Going' },
  'REVIEWED': { cls: 'badge-reviewed', label: 'Reviewed' },
};

// Convert "HH:MM" 24h → "HH:MM AM/PM". Passes already-formatted strings through.
const formatTime = (t) => {
  if (!t) return '—';
  if (t.includes('AM') || t.includes('PM')) return t;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
};

const ACCENT_COLORS = {
  'BOOKED':   '#2563eb',
  'ARRIVED':  '#059669',
  'ON-GOING': '#d97706',
  'REVIEWED': '#7c3aed',
};

const Dashboard = () => {
  const [appointments, setAppointments]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [syncing, setSyncing]             = useState(false);

  // Filters
  const [statusFilter, setStatusFilter]   = useSessionState('dashboard_statusFilter', 'All');
  const [dateFilter, setDateFilter]       = useSessionState('dashboard_dateFilter', getLocalDateString());
  const [nameFilter, setNameFilter]       = useSessionState('dashboard_nameFilter', '');

  // Modals
  const [showNewAppt, setShowNewAppt]                       = useState(false);
  const [selectedApptForVitals, setSelectedApptForVitals]   = useState(null);
  const [selectedApptForTests, setSelectedApptForTests]     = useState(null);
  const [selectedApptForPrescription, setSelectedApptForPrescription] = useState(null);
  const [selectedApptForAttachment, setSelectedApptForAttachment]     = useState(null);
  const [selectedDashboardPatient, setSelectedDashboardPatient]       = useSessionState('dashboard_selectedPatient', null);
  const [selectedDashboardApptId, setSelectedDashboardApptId]         = useSessionState('dashboard_selectedAppointmentId', null);
  const [initialDashboardTab, setInitialDashboardTab]                 = useSessionState('dashboard_initialTab', 'Appnt');
  const [dropdownOpenId, setDropdownOpenId]                           = useState(null);

  const fetchAppointments = useCallback(async (showSync = false) => {
    try {
      if (showSync) setSyncing(true);
      else setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase();
      if (dateFilter) params.date = dateFilter;
      const data = await frontdeskService.getAppointments(params);
      const filtered = nameFilter
        ? data.filter(a => a.patient?.name?.toLowerCase().includes(nameFilter.toLowerCase()))
        : data;
      setAppointments(filtered);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [statusFilter, dateFilter, nameFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── WebSocket real-time sync ────────────────────────────────────
  useWebSocket({
    APPOINTMENT_CREATED:        () => fetchAppointments(true),
    APPOINTMENT_STATUS_CHANGED: () => fetchAppointments(true),
    VITALS_UPDATED:             () => fetchAppointments(true),
    BILL_CREATED:               () => fetchAppointments(true),
    BILL_UPDATED:               () => fetchAppointments(true),
    TEST_RESULTS_SAVED:         () => fetchAppointments(true),
    ATTACHMENT_UPLOADED:        () => fetchAppointments(true),
  });

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.appt-action-dropdown')) setDropdownOpenId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const statusOptions = ['All', 'Booked', 'Arrived', 'On-Going', 'Reviewed'];

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 56px)', background: 'var(--gray-100)' }}>

      {/* ── Toolbar ── */}
      <div className="page-toolbar" style={{ background: '#fff', gap: 10 }}>
        {/* Name search */}
        <div className="search-wrapper" style={{ flex: '0 0 auto' }}>
          <Search size={15} className="search-icon" style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            className="hp-input form-control"
            placeholder="Search patient…"
            style={{ width: 210, paddingLeft: 34, height: 38, fontSize: '0.9rem' }}
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
          />
        </div>

        {/* Status filters */}
        <div className="status-tabs">
          {statusOptions.map(s => (
            <button
              key={s}
              className={`status-tab ${statusFilter === s ? `active ${s.toLowerCase().replace('-', '')}` : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="ms-auto d-flex align-items-center gap-2">
          {/* Date picker */}
          <div className="d-flex align-items-center gap-1" style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', height: 38 }}>
            <CalendarIcon size={14} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
            <input
              type="date"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--gray-800)' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          <button className="btn-hp-ghost" onClick={() => setDateFilter(getLocalDateString())}>
            Today
          </button>
          <button className="btn-hp-primary" onClick={() => setShowNewAppt(true)}>
            <Plus size={14} /> New Appointment
          </button>
        </div>
      </div>

      {/* ── Syncing indicator ── */}
      {syncing && (
        <div className="sync-toast">
          <RefreshCw size={14} className="spin" />
          Syncing…
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-grow-1 overflow-auto" style={{ background: '#fff' }}>
        <table className="hp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Age</th>
              <th>Time</th>
              <th>Doctor</th>
              <th>Service</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-5 text-secondary">
                <RefreshCw size={18} className="spin me-2" />Loading…
              </td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-5">
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>No appointments found</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
                  Try a different date or status filter
                </div>
              </td></tr>
            ) : (
              appointments.map((appt, idx) => {
                const st = STATUS_STYLES[appt.status] || { cls: 'badge-default', label: appt.status };
                const accentColor = ACCENT_COLORS[appt.status] || '#64748b';
                return (
                  <tr key={appt._id}>
                    <td style={{ color: 'var(--gray-400)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {appt.patient?.patientId || `#${appt._id?.slice(-5)}`}
                    </td>
                    <td>
                      <div
                        className="d-flex align-items-center gap-2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedDashboardPatient(appt.patient)}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: `${accentColor}20`,
                          border: `2px solid ${accentColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, color: accentColor, flexShrink: 0
                        }}>
                          {appt.patient?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.95rem' }}>
                          {appt.patient?.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-600)', fontWeight: 500 }}>{appt.patient?.age || '—'}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.92rem' }}>{formatTime(appt.time)}</td>
                    <td style={{ color: 'var(--gray-600)' }}>{appt.doctorName || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.service || '—'}</td>
                    <td>
                      <span className={`status-badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <div className="position-relative appt-action-dropdown">
                        <button
                          className="btn-hp-ghost d-flex align-items-center gap-1"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => setDropdownOpenId(dropdownOpenId === appt._id ? null : appt._id)}
                        >
                          Actions <ChevronDown size={12} />
                        </button>
                        {dropdownOpenId === appt._id && (
                          <div className="hp-dropdown fade-in" style={{ position: 'absolute', left: 0, top: '110%' }}>
                            <div className="hp-dropdown-item" onClick={() => { setSelectedApptForVitals(appt); setDropdownOpenId(null); }}>
                              <Briefcase size={15} style={{ color: '#0891b2' }} /> Vitals
                            </div>
                            <div className="hp-dropdown-item" onClick={() => { setSelectedApptForTests(appt); setDropdownOpenId(null); }}>
                              <PlusCircle size={15} style={{ color: '#7c3aed' }} /> Test Results
                            </div>
                            <div className="hp-dropdown-item" onClick={() => { setSelectedApptForPrescription(appt); setDropdownOpenId(null); }}>
                              <FileText size={15} style={{ color: '#059669' }} /> Prescription
                            </div>
                            <div className="hp-dropdown-item" onClick={() => { setSelectedApptForAttachment(appt); setDropdownOpenId(null); }}>
                              <Paperclip size={15} style={{ color: '#d97706' }} /> Attachments
                            </div>
                            <div className="hp-dropdown-item" onClick={() => {
                              setInitialDashboardTab('Add Bills');
                              setSelectedDashboardPatient(appt.patient);
                              setSelectedDashboardApptId(appt._id);
                              setDropdownOpenId(null);
                            }}>
                              <Stethoscope size={15} style={{ color: '#dc2626' }} /> Add Bill
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ── */}
      {showNewAppt && (
        <NewAppointmentModal
          onClose={() => setShowNewAppt(false)}
          onSuccess={() => { setShowNewAppt(false); fetchAppointments(); }}
        />
      )}

      {selectedApptForVitals && (
        <VitalsModal
          appointment={selectedApptForVitals}
          onClose={() => setSelectedApptForVitals(null)}
          onSuccess={() => { setSelectedApptForVitals(null); fetchAppointments(); }}
        />
      )}

      {selectedApptForTests && (
        <TestResultModal
          appointment={selectedApptForTests}
          onClose={() => setSelectedApptForTests(null)}
          onSuccess={() => { setSelectedApptForTests(null); fetchAppointments(); }}
        />
      )}

      {selectedApptForPrescription && (
        <PrescriptionModal
          appointment={selectedApptForPrescription}
          onClose={() => setSelectedApptForPrescription(null)}
        />
      )}

      {selectedApptForAttachment && (
        <AttachmentModal
          appointment={selectedApptForAttachment}
          onClose={() => setSelectedApptForAttachment(null)}
        />
      )}

      {selectedDashboardPatient && (
        <PatientDashboardModal
          patient={selectedDashboardPatient}
          initialTab={initialDashboardTab}
          appointmentId={selectedDashboardApptId}
          onClose={() => {
            setSelectedDashboardPatient(null);
            setSelectedDashboardApptId(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
