import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, CheckCircle } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import serviceApi from '../../services/serviceApi';
import { getLocalDateString } from '../../utils/dateUtils';

const DURATIONS = ['5 mins', '10 mins', '15 mins', '20 mins', '30 mins', '45 mins', '1 hour'];

// Convert "HH:MM AM/PM" or "HH:MM" (24h) → "HH:MM" 24-hour for <input type="time">
const to24h = (timeStr) => {
  if (!timeStr) return '';
  const str = timeStr.trim();
  // Already has AM/PM
  const amPmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let h = parseInt(amPmMatch[1]);
    const m = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${m}`;
  }
  // Pure HH:MM 24h
  const plain = str.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return `${String(parseInt(plain[1])).padStart(2,'0')}:${plain[2]}`;
  return '';
};

// Convert "HH:MM" 24h → "HH:MM AM/PM" for storage
const to12h = (timeStr24) => {
  if (!timeStr24) return '';
  const [hStr, mStr] = timeStr24.split(':');
  let h = parseInt(hStr);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2,'0')}:${m} ${period}`;
};

const RescheduleModal = ({ appointment, onClose, onSuccess }) => {
  const appt = appointment;

  const [form, setForm] = useState({
    date:       appt.date ? getLocalDateString(new Date(appt.date)) : getLocalDateString(),
    time24:     to24h(appt.time) || '',   // always 24h for the input
    doctorName: appt.doctorName || '',
    service:    appt.service    || '',
    duration:   appt.duration   || '15 mins',
  });

  const [doctors, setDoctors]   = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [staff, svcs] = await Promise.all([
          adminService.getStaff(),
          serviceApi.getServices().catch(() => []),
        ]);
        setDoctors((staff || []).filter(s => s.role === 'Doctor'));
        setServices(svcs || []);
      } catch (e) {
        console.error('Failed to load doctors/services', e);
      }
    };
    load();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.date)    { setError('Please select a new date.');  return; }
    if (!form.time24)  { setError('Please enter a new time.'); return; }
    setSaving(true);
    try {
      // Store as "HH:MM AM/PM" format (same as what the app normally creates)
      const storeTime = to12h(form.time24);
      await frontdeskService.updateAppointment(appt._id, {
        date:       form.date,
        time:       storeTime,
        doctorName: form.doctorName || appt.doctorName,
        service:    form.service    || appt.service,
        duration:   form.duration,
        status:     'BOOKED',       // Reset to BOOKED on reschedule
      });
      setSaved(true);
      setTimeout(() => { onSuccess && onSuccess(); onClose(); }, 900);
    } catch (err) {
      console.error('Reschedule error:', err);
      setError('Failed to reschedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Format current appointment time nicely for the header
  const currentTime = appt.time || '—';
  const currentDate = appt.date
    ? new Date(appt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1060,
        backgroundColor: 'rgba(15,23,42,0.58)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fdFadeIn 0.18s ease'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500,
        boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
        overflow: 'hidden', animation: 'fdSlideUp 0.22s ease'
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #312e81, #6d28d9)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={17} /> Reschedule Appointment
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: 4 }}>
              <strong style={{ color: '#c4b5fd' }}>{appt.patient?.name}</strong>
              <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
              Currently: {currentTime} on {currentDate}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: 8, color: '#fff', padding: '6px 8px',
            cursor: 'pointer', display: 'flex', flexShrink: 0
          }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.84rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}><Calendar size={11} style={{ marginRight: 3 }} />New Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}><Clock size={11} style={{ marginRight: 3 }} />New Time *</label>
              <input
                type="time"
                value={form.time24}
                onChange={e => set('time24', e.target.value)}
                style={inp}
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={lbl}>Duration</label>
            <select value={form.duration} onChange={e => set('duration', e.target.value)} style={sel}>
              {DURATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label style={lbl}><User size={11} style={{ marginRight: 3 }} />Doctor</label>
            <select value={form.doctorName} onChange={e => set('doctorName', e.target.value)} style={sel}>
              <option value="">Keep current ({appt.doctorName || 'None'})</option>
              {doctors.map(d => (
                <option key={d._id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label style={lbl}><Stethoscope size={11} style={{ marginRight: 3 }} />Service</label>
            <select value={form.service} onChange={e => set('service', e.target.value)} style={sel}>
              <option value="">Keep current ({appt.service || 'None'})</option>
              {services.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
              {services.length === 0 && ['FIRST CONSULTATION', 'FOLLOW UP CONSULTATION', 'REPORT'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {form.date && form.time24 && (
            <div style={{ padding: '10px 14px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, fontSize: '0.83rem', color: '#5b21b6', fontWeight: 600 }}>
              📅 Will be rescheduled to: {new Date(form.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} at {to12h(form.time24)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 26px', background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center'
        }}>
          <button onClick={onClose} style={{
            padding: '10px 22px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', background: '#fff',
            color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem'
          }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none',
              background: saved
                ? 'linear-gradient(135deg,#065f46,#059669)'
                : 'linear-gradient(135deg,#312e81,#6d28d9)',
              color: '#fff', fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer', fontSize: '0.88rem',
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: saving ? 0.85 : 1, transition: 'all 0.2s',
              minWidth: 170
            }}
          >
            {saved ? (
              <><CheckCircle size={15} /> Rescheduled!</>
            ) : saving ? (
              <><span style={spinner} /> Saving…</>
            ) : (
              <><Calendar size={15} /> Confirm Reschedule</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fdFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes fdSlideUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }
        @keyframes fdSpin    { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
};

// Style helpers
const lbl = {
  fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 5, display: 'block'
};
const inp = {
  width: '100%', padding: '9px 13px',
  border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: '0.9rem', outline: 'none',
  color: '#1e293b', fontWeight: 600, background: '#f8fafc',
  boxSizing: 'border-box'
};
const sel = {
  ...inp, cursor: 'pointer'
};
const spinner = {
  width: 14, height: 14,
  border: '2px solid rgba(255,255,255,0.4)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  display: 'inline-block',
  animation: 'fdSpin 0.7s linear infinite'
};

export default RescheduleModal;
