import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, CalendarIcon, Plus, ChevronDown, Stethoscope,
  FileText, Paperclip, Briefcase, PlusCircle, RefreshCw, Printer,
  XCircle, CalendarClock, Microscope
} from 'lucide-react';
import frontdeskService from '../services/frontdeskService';
import adminService from '../services/adminService';
import useSessionState from '../hooks/useSessionState';
import useWebSocket from '../hooks/useWebSocket';
import NewAppointmentModal from '../components/FrontDesk/NewAppointmentModal';
import VitalsModal from '../components/FrontDesk/VitalsModal';
import TestResultModal from '../components/FrontDesk/TestResultModal';
import PrescriptionModal from '../components/FrontDesk/PrescriptionModal';
import AttachmentModal from '../components/FrontDesk/AttachmentModal';
import PatientDashboardModal from '../components/FrontDesk/PatientDashboard/PatientDashboardModal';
import RescheduleModal from '../components/FrontDesk/RescheduleModal';
import PaymentModal from '../components/FrontDesk/PaymentModal';
import { getLocalDateString } from '../utils/dateUtils';

const STATUS_STYLES = {
  'BOOKED':     { cls: 'badge-booked',     label: 'Booked' },
  'ARRIVED':    { cls: 'badge-arrived',    label: 'Arrived' },
  'ON-GOING':   { cls: 'badge-ongoing',    label: 'On-Going' },
  'REVIEWED':   { cls: 'badge-reviewed',   label: 'Reviewed' },
  'CANCELLED':  { cls: 'badge-cancelled',  label: 'Cancelled' },
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

// ─── Print bill for a patient ─────────────────────────────────────────────────
const handlePrintBill = async (patient, billSummary) => {
  if (!billSummary) { alert('No bill found for this patient.'); return; }
  try {
    const bills = await frontdeskService.getBills({ patientId: patient.patientId });
    if (!bills || bills.length === 0) { alert('No bills found for this patient.'); return; }

    const totalFinal    = bills.reduce((s, b) => s + (b.finalAmount    || 0), 0);
    const totalReceived = bills.reduce((s, b) => s + (b.receivedAmount || 0), 0);
    const totalBalance  = bills.reduce((s, b) => s + (b.totalBalance   || 0), 0);
    const isPaid = totalBalance <= 0;

    const billRows = bills.map((bill, bi) => {
      const itemRows = (bill.items || []).map((item, i) => `
        <tr>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${i + 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.serviceName}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty || 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right">₹${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-₹${parseFloat(item.discount || 0).toFixed(2)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1d4ed8">₹${parseFloat(item.totalPrice || 0).toFixed(2)}</td>
        </tr>`).join('');
      const payRows = (bill.payments || []).map(p => `
        <tr>
          <td style="padding:5px 10px;font-size:12px">${new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
          <td style="padding:5px 10px;font-size:12px">${p.paymentMode}</td>
          <td style="padding:5px 10px;font-size:12px;font-weight:700;color:#059669">₹${parseFloat(p.amount).toFixed(2)}</td>
        </tr>`).join('');
      return `
        <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px dashed #e2e8f0">
          <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">
            Bill #${bill.billNo || bill._id?.slice(-6).toUpperCase() || (bi + 1)} &nbsp;·&nbsp;
            <span style="font-weight:400;color:#64748b">${new Date(bill.billDate || bill.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
            &nbsp;·&nbsp;
            <span style="font-weight:700;color:${bill.totalBalance > 0 ? '#dc2626' : '#059669'}">${bill.totalBalance > 0 ? 'UNPAID' : 'PAID'}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">#</th>
              <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Service</th>
              <th style="padding:7px 10px;text-align:center;font-size:10px;text-transform:uppercase;color:#64748b">Qty</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:#64748b">Unit Price</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:#64748b">Discount</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:#64748b">Total</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="display:flex;justify-content:flex-end">
            <div style="min-width:240px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span style="color:#64748b">Billed</span><span>₹${parseFloat(bill.totalBilledAmount||0).toFixed(2)}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;color:#dc2626"><span>Discount</span><span>-₹${parseFloat(bill.totalDiscount||0).toFixed(2)}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;border-top:1px solid #e2e8f0;padding-top:5px;margin-bottom:8px"><span>Final</span><span style="color:#1d4ed8">₹${parseFloat(bill.finalAmount||0).toFixed(2)}</span></div>
              ${(bill.payments||[]).length > 0 ? `<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px">Payment History</div><table style="width:100%;border-collapse:collapse"><tbody>${payRows}</tbody></table>` : ''}
              <div style="display:flex;justify-content:space-between;padding:7px 10px;border-radius:7px;margin-top:6px;background:${bill.totalBalance > 0 ? '#fef2f2' : '#f0fdf4'};font-weight:800">
                <span style="color:${bill.totalBalance > 0 ? '#dc2626' : '#059669'}">Balance Due</span>
                <span style="color:${bill.totalBalance > 0 ? '#dc2626' : '#059669'}">₹${parseFloat(bill.totalBalance||0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Invoice — ${patient.name}</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}table{width:100%;border-collapse:collapse}@media print{body{padding:16px}}</style>
    </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #2563eb">
      <div><h2 style="margin:0;color:#1d4ed8;font-size:22px">${localStorage.getItem('clinicName') || 'mediplix'}</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px">Medical Invoice / Receipt</p></div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:#2563eb">INVOICE</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px">Printed: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
        <div style="font-size:12px;margin-top:2px">Status: <b style="color:${isPaid?'#059669':'#dc2626'}">${isPaid?'FULLY PAID':'BALANCE DUE'}</b></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div style="background:#f8fafc;padding:14px;border-radius:10px">
        <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Patient Details</div>
        <div style="font-weight:700;font-size:16px">${patient.name||'—'}</div>
        <div style="color:#64748b;margin-top:3px">${patient.gender||''} · ${patient.age||''} yrs</div>
        <div style="color:#64748b">${patient.phone||''}</div>
        <div style="color:#64748b">Patient ID: ${patient.patientId||''}</div>
      </div>
      <div style="background:#f8fafc;padding:14px;border-radius:10px">
        <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Amount Summary</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span>Total Billed</span><span>₹${totalFinal.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#059669"><span>Total Received</span><span>₹${totalReceived.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px;padding-top:6px;border-top:1px solid #e2e8f0"><span>Balance Due</span><span style="color:${isPaid?'#059669':'#dc2626'}">₹${totalBalance.toFixed(2)}</span></div>
      </div>
    </div>
    ${billRows}
    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">Thank you for choosing mediplix &nbsp;·&nbsp; Computer-generated invoice</div>
    </body></html>`;

    let iframe = document.getElementById('dash-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'dash-print-frame';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
      document.body.appendChild(iframe);
    }
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); };
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e) {} }, 700);
  } catch (err) {
    console.error('Print bill error:', err);
    alert('Could not load bill data. Please try again.');
  }
};

// ─── Bill Cell: 🖨️ icon + color-coded amount ──────────────────────────────────
const BillCell = ({ appt, onPaymentClick, onPrintClick }) => {
  const bill = appt.billSummary;
  const finalAmt    = parseFloat(bill?.finalAmount    || 0);
  const receivedAmt = parseFloat(bill?.receivedAmount || 0);
  const balanceAmt  = parseFloat(bill?.totalBalance   || 0);
  const isPaid    = bill && (bill.billStatus === 'Paid'   || (finalAmt > 0 && balanceAmt <= 0));
  const isPartial = bill && (bill.billStatus === 'Partial' || (receivedAmt > 0 && balanceAmt > 0));
  const isUnpaid  = bill && !isPaid && !isPartial && finalAmt > 0;

  const iconColor = isPaid ? '#059669' : isPartial ? '#d97706' : isUnpaid ? '#dc2626' : '#94a3b8';

  let amountNode;
  if (!bill || finalAmt === 0) {
    amountNode = <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>—</span>;
  } else {
    // Shared style for clickable amount
    const amtStyle = { cursor: 'pointer', display: 'inline-block' };
    const handleClick = (e) => { e.stopPropagation(); onPaymentClick(appt); };

    if (isPaid) {
      amountNode = <span style={{ ...amtStyle, fontWeight: 800, color: '#059669', fontSize: '0.92rem' }} onClick={handleClick} title="View Payment Details">{finalAmt.toFixed(0)}</span>;
    } else if (isPartial) {
      amountNode = (
        <span style={{ ...amtStyle, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.84rem' }} onClick={handleClick} title="Make Payment">
          <span style={{ fontWeight: 700, color: '#059669' }}>{receivedAmt.toFixed(0)}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>+</span>
          <span style={{ fontWeight: 700, color: '#dc2626' }}>{balanceAmt.toFixed(0)}</span>
        </span>
      );
    } else {
      amountNode = <span style={{ ...amtStyle, fontWeight: 800, color: '#dc2626', fontSize: '0.92rem' }} onClick={handleClick} title="Make Payment">{finalAmt.toFixed(0)}</span>;
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <button
        onClick={e => { e.stopPropagation(); onPrintClick(appt.patient, bill); }}
        title={bill ? 'Print Bill' : 'No bill yet'}
        style={{
          background: 'none', border: 'none', padding: '2px 3px', cursor: bill ? 'pointer' : 'default',
          color: iconColor, display: 'flex', alignItems: 'center', flexShrink: 0,
          opacity: bill ? 1 : 0.4, transition: 'opacity 0.15s'
        }}
        onMouseEnter={e => { if (bill) e.currentTarget.style.opacity = '0.65'; }}
        onMouseLeave={e => { if (bill) e.currentTarget.style.opacity = '1'; }}
      >
        <Printer size={15} />
      </button>
      {amountNode}
    </div>
  );
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
  const [selectedApptForReschedule, setSelectedApptForReschedule]     = useState(null);
  const [selectedBillForPayment, setSelectedBillForPayment]           = useState(null);
  const [dropdownOpenId, setDropdownOpenId]                           = useState(null);

  // ── Doctor filter ──────────────────────────────────────────────
  const [doctors, setDoctors]                 = useState([]);
  const [doctorFilter, setDoctorFilter]       = useSessionState('dashboard_doctorFilter', 'ALL');
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);

  // Fetch doctors once
  useEffect(() => {
    adminService.getStaff().then(staff => {
      setDoctors((staff || []).filter(s => s.role === 'Doctor'));
    }).catch(() => {});
  }, []);

  const fetchAppointments = useCallback(async (showSync = false) => {
    try {
      if (showSync) setSyncing(true);
      else setLoading(true);
      const params = {};
      const STATUS_MAP = { 'Booked': 'BOOKED', 'Arrived': 'ARRIVED', 'On-Going': 'ON-GOING', 'Reviewed': 'REVIEWED', 'Cancelled': 'CANCELLED' };
      if (statusFilter !== 'All') params.status = STATUS_MAP[statusFilter] || statusFilter.toUpperCase();
      if (dateFilter) params.date = dateFilter;
      const data = await frontdeskService.getAppointments(params);
      let filtered = nameFilter
        ? data.filter(a => a.patient?.name?.toLowerCase().includes(nameFilter.toLowerCase()))
        : data;
      // Doctor filter (client-side)
      if (doctorFilter !== 'ALL') {
        const selDoc = doctorFilter.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
        filtered = filtered.filter(a => (a.doctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim() === selDoc);
      }
      setAppointments(filtered);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [statusFilter, dateFilter, nameFilter, doctorFilter]);

  // Cancel appointment — defined after fetchAppointments to avoid closure issues
  const cancelAppointment = useCallback(async (appt) => {
    const confirmed = window.confirm(
      `Cancel appointment for ${appt.patient?.name}?\n\nThis action can be reversed by rescheduling.`
    );
    if (!confirmed) return;
    try {
      await frontdeskService.updateAppointmentStatus(appt._id, 'CANCELLED');
      fetchAppointments(true);
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel. Please try again.');
    }
  }, [fetchAppointments]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── WebSocket real-time sync ────────────────────────────────────
  useWebSocket({
    APPOINTMENT_CREATED:        () => fetchAppointments(true),
    APPOINTMENT_STATUS_CHANGED: () => fetchAppointments(true),
    APPOINTMENT_UPDATED:        () => fetchAppointments(true),
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

  const statusOptions = ['All', 'Booked', 'Arrived', 'On-Going', 'Reviewed', 'Cancelled'];

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

        {/* ── Doctor Filter Dropdown ── */}
        {(() => {
          const doctorsBySpec = doctors.reduce((acc, d) => {
            const spec = d.speciality || d.department || 'General';
            if (!acc[spec]) acc[spec] = [];
            acc[spec].push(d);
            return acc;
          }, {});
          const selLabel = doctorFilter === 'ALL'
            ? 'All Doctors'
            : `Dr. ${doctorFilter.replace(/^dr\.?\s*/i, '').trim()}`;
          return (
            <div className="position-relative" style={{ zIndex: 200 }}>
              <button
                id="fd-doctor-filter-btn"
                className="d-flex align-items-center gap-1"
                onClick={() => setDocDropdownOpen(o => !o)}
                style={{
                  padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--gray-200)',
                  background: doctorFilter !== 'ALL' ? 'var(--primary-light)' : 'var(--gray-50)',
                  color: doctorFilter !== 'ALL' ? 'var(--primary)' : 'var(--gray-600)',
                  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', height: 38,
                  whiteSpace: 'nowrap', outline: 'none'
                }}
              >
                👨‍⚕️ {selLabel}
                <ChevronDown size={12} />
              </button>
              {docDropdownOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setDocDropdownOpen(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    border: '1px solid var(--gray-200)', minWidth: 220, zIndex: 200, overflow: 'hidden'
                  }}>
                    <div
                      onClick={() => { setDoctorFilter('ALL'); setDocDropdownOpen(false); }}
                      style={{
                        padding: '9px 14px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700,
                        color: doctorFilter === 'ALL' ? 'var(--primary)' : 'var(--gray-700)',
                        background: doctorFilter === 'ALL' ? 'var(--primary-light)' : 'transparent',
                        borderBottom: '1px solid var(--gray-100)'
                      }}
                    >
                      🏥 All Doctors
                    </div>
                    {Object.entries(doctorsBySpec).map(([spec, docs]) => (
                      <div key={spec}>
                        <div style={{
                          padding: '5px 14px 3px', fontSize: '0.68rem', fontWeight: 800,
                          color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em',
                          background: 'var(--gray-50)'
                        }}>{spec}</div>
                        {docs.map(d => {
                          const clean = d.name.replace(/^dr\.?\s*/i, '').trim();
                          const isSel = doctorFilter.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === clean.toLowerCase();
                          return (
                            <div
                              key={d._id}
                              onClick={() => { setDoctorFilter(d.name); setDocDropdownOpen(false); }}
                              style={{
                                padding: '8px 14px 8px 20px', fontSize: '0.83rem', cursor: 'pointer',
                                fontWeight: isSel ? 700 : 500,
                                color: isSel ? 'var(--primary)' : 'var(--gray-700)',
                                background: isSel ? 'var(--primary-light)' : 'transparent',
                              }}
                              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--gray-50)'; }}
                              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                            >
                              Dr. {clean}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {doctors.length === 0 && (
                      <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--gray-400)', textAlign: 'center' }}>No doctors added yet</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        <div className="ms-auto d-flex align-items-center gap-2">
          {/* Lab Orders button matching the original app's toolbar */}
          <button 
            className="btn btn-sm d-flex align-items-center justify-content-center" 
            style={{ width: 38, height: 38, borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-600)' }}
            title="Lab Orders / Payments" 
            onClick={() => window.location.href = '/lab'}
          >
            <Microscope size={18} />
          </button>

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
              <th style={{ whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Printer size={12} style={{ opacity: 0.55 }} /> Bill
                </span>
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-5 text-secondary">
                <RefreshCw size={18} className="spin me-2" />Loading…
              </td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-5">
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
                  <tr key={appt._id} style={{ opacity: appt.status === 'CANCELLED' ? 0.55 : 1 }}>
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
                    {/* ── Bill column: 🖨️ + colored amount ── */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <BillCell 
                        appt={appt} 
                        onPaymentClick={setSelectedBillForPayment}
                        onPrintClick={handlePrintBill}
                      />
                    </td>
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
                            <div className="hp-dropdown-item" onClick={() => {
                              setDropdownOpenId(null);
                              handlePrintBill(appt.patient, appt.billSummary);
                            }}>
                              <Printer size={15} style={{ color: '#2563eb' }} /> Print Bill
                            </div>
                            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                            <div className="hp-dropdown-item" onClick={() => {
                              setDropdownOpenId(null);
                              setSelectedApptForReschedule(appt);
                            }}>
                              <CalendarClock size={15} style={{ color: '#7c3aed' }} /> Reschedule
                            </div>
                            {appt.status !== 'CANCELLED' && (
                              <div className="hp-dropdown-item" onClick={() => {
                                setDropdownOpenId(null);
                                cancelAppointment(appt);
                              }} style={{ color: '#dc2626' }}>
                                <XCircle size={15} style={{ color: '#dc2626' }} /> Cancel
                              </div>
                            )}
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

      {selectedApptForReschedule && (
        <RescheduleModal
          appointment={selectedApptForReschedule}
          onClose={() => setSelectedApptForReschedule(null)}
          onSuccess={() => { setSelectedApptForReschedule(null); fetchAppointments(); }}
        />
      )}

      {selectedBillForPayment && (
        <PaymentModal
          appointment={selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          onUpdate={() => fetchAppointments(true)}
          handlePrintBill={handlePrintBill}
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
