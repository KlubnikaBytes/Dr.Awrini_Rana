import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, CalendarIcon, Plus, ChevronDown, Stethoscope,
  FileText, Paperclip, Briefcase, PlusCircle, RefreshCw, Printer,
  XCircle, CalendarClock, Microscope, Receipt, Trash2, Edit2,
  List, FlaskConical, PlusSquare, Info
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
import MergeBillModal from '../components/MergeBillModal';
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

    // Fetch clinic info for logo + phone
    let clinicData = null;
    try {
      const { default: clinicService } = await import('../services/clinicService');
      const clinics = await clinicService.getAllClinics();
      const storedId   = localStorage.getItem('clinicId')  || '';
      const storedName = localStorage.getItem('clinicName') || '';
      clinicData = clinics.find(c => c._id === storedId || c.name?.toLowerCase() === storedName.toLowerCase()) || clinics[0] || null;
    } catch (_) {}
    const { getInvoiceHeader, getInvoiceFooter } = await import('../utils/printTemplates');
    const API_BASE   = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const clinicLogo  = clinicData?.logo  ? `${API_BASE}/${clinicData.logo.replace(/^\/+/, '')}` : null;
    const clinicPhone = clinicData?.phone || localStorage.getItem('clinicPhone') || '9002535240';
    const clinicName  = clinicData?.name  || localStorage.getItem('clinicName') || 'Clinic';

    const html = `<!DOCTYPE html><html><head><title>Invoice — ${patient.name}</title>
    <style>body { box-sizing: border-box; min-height: 98vh; display: flex; flex-direction: column; font-family:Arial,sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}table{width:100%;border-collapse:collapse}@media print{body{padding:16px}}</style>
    </head><body>
    ${getInvoiceHeader(clinicName, clinicLogo, clinicPhone, `
      <div style="font-weight:700;color:#2563eb;font-size:13px">INVOICE</div>
      <div style="color:#64748b;margin-top:2px;font-size:13px">Printed: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
      <div style="margin-top:2px;font-weight:700;font-size:13px;color:${isPaid?'#059669':'#dc2626'}">Status: ${isPaid?'FULLY PAID':'BALANCE DUE'}</div>
    `)}
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
    ${getInvoiceFooter()}
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
  const pastDue     = parseFloat(bill?.pastDue        || 0);
  
  const noBill      = !bill || finalAmt === 0;
  const isPaid      = !noBill && (bill.billStatus === 'Paid'   || balanceAmt <= 0);
  const isPartial   = !noBill && (bill.billStatus === 'Partial' || (receivedAmt > 0 && balanceAmt > 0));
  const isUnpaid    = !noBill && !isPaid && !isPartial;

  const iconColor = isPaid ? '#059669' : isPartial ? '#d97706' : isUnpaid ? '#dc2626' : '#94a3b8';

  let amountNode;
  if (noBill && pastDue <= 0) {
    amountNode = <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>—</span>;
  } else {
    // Shared style for clickable amount
    const amtStyle = { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 };
    const handleClick = (e) => { e.stopPropagation(); onPaymentClick(appt); };

    let currentBillNode = null;
    if (isPaid) {
      currentBillNode = <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem' }} title="View Payment Details">{finalAmt.toFixed(0)}</span>;
    } else if (isPartial) {
      currentBillNode = (
        <span title="Make Payment" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.84rem' }}>{receivedAmt.toFixed(0)}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>+</span>
          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.84rem' }}>{balanceAmt.toFixed(0)}</span>
        </span>
      );
    } else if (isUnpaid) {
      currentBillNode = <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.92rem' }} title="Make Payment">{finalAmt.toFixed(0)}</span>;
    }

    amountNode = (
      <span style={amtStyle} onClick={handleClick}>
        {currentBillNode}
        {pastDue > 0 && (
           <span title="Past Due" style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.75rem', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '4px', marginLeft: currentBillNode ? '4px' : '0' }}>
             Due: {pastDue.toFixed(0)}
           </span>
        )}
      </span>
    );
  }

  const isOnlyLab = finalAmt > 0 && finalAmt === parseFloat(bill?.apptLabTestsAmount || 0);
  const isOnlyDayCare = finalAmt > 0 && finalAmt === parseFloat(bill?.apptDayCareAmount || 0);
  const isOnlyHomeCare = finalAmt > 0 && finalAmt === parseFloat(bill?.apptHomeCareAmount || 0);

  const isOnlyConsultation = finalAmt > 0 && finalAmt === parseFloat(bill?.apptConsultAmount || 0);

  let mainLabel = null;
  if (isOnlyLab) {
    mainLabel = <span style={{ color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>{bill.apptLabTestsCount} Lab Tests</span>;
  } else if (isOnlyDayCare) {
    mainLabel = <span style={{ color: '#7c3aed', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>Day Care</span>;
  } else if (isOnlyHomeCare) {
    mainLabel = <span style={{ color: '#0ea5e9', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>Home Care</span>;
  } else if (isOnlyConsultation) {
    mainLabel = <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>Consultation</span>;
  } else if (finalAmt > 0) {
    mainLabel = <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>Total</span>;
  }

  const printButton = (
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
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
      {/* Main bill row */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {printButton}
        {amountNode}
        {mainLabel}
      </div>

      {/* Sub-rows for categorized items */}
      {parseFloat(bill?.apptConsultAmount || 0) > 0 && !isOnlyConsultation && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: -2 }}>
          {printButton}
          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPaymentClick(appt); }}>
            {parseFloat(bill.apptConsultAmount || 0).toFixed(0)}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>
            Consultation
          </span>
        </div>
      )}

      {bill?.apptLabTestsCount > 0 && !isOnlyLab && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: -2 }}>
          {printButton}
          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPaymentClick(appt); }}>
            {parseFloat(bill.apptLabTestsAmount || 0).toFixed(0)}
          </span>
          <span style={{ color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>
            {bill.apptLabTestsCount} Lab Tests
          </span>
        </div>
      )}

      {bill?.apptDayCareAmount > 0 && !isOnlyDayCare && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: -2 }}>
          {printButton}
          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPaymentClick(appt); }}>
            {parseFloat(bill.apptDayCareAmount || 0).toFixed(0)}
          </span>
          <span style={{ color: '#7c3aed', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>
            Day Care
          </span>
        </div>
      )}

      {bill?.apptHomeCareAmount > 0 && !isOnlyHomeCare && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: -2 }}>
          {printButton}
          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPaymentClick(appt); }}>
            {parseFloat(bill.apptHomeCareAmount || 0).toFixed(0)}
          </span>
          <span style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>
            Home Care
          </span>
        </div>
      )}
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
  const [categoryFilter, setCategoryFilter] = useSessionState('dashboard_categoryFilter', 'ALL');

  // Modals
  const [showNewAppt, setShowNewAppt]                       = useState(false);
  const [selectedApptForVitals, setSelectedApptForVitals]   = useState(null);
  const [selectedApptForTests, setSelectedApptForTests]     = useState(null);
  const [selectedApptForPrescription, setSelectedApptForPrescription] = useState(null);
  const [selectedApptForAttachment, setSelectedApptForAttachment]     = useState(null);
  const [selectedDashboardPatient, setSelectedDashboardPatient]       = useSessionState('dashboard_selectedPatient', null);
  const [selectedDashboardApptId, setSelectedDashboardApptId]         = useSessionState('dashboard_selectedAppointmentId', null);
  const [initialDashboardTab, setInitialDashboardTab]                 = useSessionState('dashboard_initialTab', 'Appnt');
  const [mergePatient, setMergePatient]                               = useState(null);
  const [selectedApptForReschedule, setSelectedApptForReschedule]     = useState(null);
  const [selectedApptForEdit, setSelectedApptForEdit]                 = useState(null);
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
      // Category filter
      if (categoryFilter !== 'ALL') {
        filtered = filtered.filter(a => {
          const st = a.serviceType || 'Consultation';
          const sText = (a.service || '').toLowerCase();
          const bs = a.billSummary || {};
          
          if (categoryFilter === 'Consultation') {
            return st === 'Consultation' || sText.includes('consult') || (bs.apptConsultAmount > 0);
          } else if (categoryFilter === 'Lab') {
            return st === 'Lab' || sText.includes('lab') || (bs.apptLabTestsAmount > 0) || (bs.apptLabTestsCount > 0);
          } else if (categoryFilter === 'Day Care') {
            return st === 'Day Care' || sText.includes('day care') || (bs.apptDayCareAmount > 0);
          } else if (categoryFilter === 'Home Care') {
            return st === 'Home Care' || sText.includes('home care') || (bs.apptHomeCareAmount > 0);
          }
          return true;
        });
      }
      // Doctor filter (client-side)
      if (doctorFilter !== 'ALL') {
        const selDoc = doctorFilter.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
        filtered = filtered.filter(a => (a.doctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim() === selDoc);
      }
      // Pending on top (by queue number), reviewed sink to bottom
      filtered = filtered.sort((a, b) => {
        const aReviewed = a.status === 'REVIEWED' ? 1 : 0;
        const bReviewed = b.status === 'REVIEWED' ? 1 : 0;
        if (aReviewed !== bReviewed) return aReviewed - bReviewed;
        const qA = a.queueNumber ?? 9999;
        const qB = b.queueNumber ?? 9999;
        if (qA !== qB) return qA - qB;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      setAppointments(filtered);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [statusFilter, dateFilter, nameFilter, doctorFilter, categoryFilter]);

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

  const deleteAppt = useCallback(async (appt) => {
    const confirmed = window.confirm(
      `DELETE appointment for ${appt.patient?.name}?\n\nWARNING: This will permanently remove this record. If this was the last patient added, the Patient ID counter will be adjusted properly. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await frontdeskService.deleteAppointment(appt._id);
      fetchAppointments(true);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete. Please try again.');
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
    MERGED_BILL_PAYMENT:        () => fetchAppointments(true),
    LAB_ORDER_UPDATED:          () => fetchAppointments(true),
    DAYCARE_UPDATED:            () => fetchAppointments(true),
    HOMECARE_UPDATED:           () => fetchAppointments(true),
    PATIENT_UPDATED:            (patient) => {
      fetchAppointments(true);
      // If the currently open dashboard modal matches the updated patient, update its local state too.
      if (selectedDashboardPatient && selectedDashboardPatient._id === patient._id) {
        setSelectedDashboardPatient(patient);
      }
    },
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
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 56px)', background: 'var(--gray-100)', overflow: 'hidden', width: '100%' }}>

      {/* ── Toolbar ── */}
      <div className="page-toolbar flex-shrink-0 d-flex align-items-center" style={{ background: '#fff', gap: 10, flexWrap: 'wrap', paddingBottom: '12px' }}>
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

        {/* Category filters (Circle Buttons) */}
        <div className="d-flex align-items-center gap-2 me-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, border: categoryFilter === 'ALL' ? '1.5px solid #0369a1' : '1.5px solid var(--gray-200)', background: categoryFilter === 'ALL' ? '#e0f2fe' : '#fff', color: categoryFilter === 'ALL' ? '#0369a1' : 'var(--gray-600)', padding: 0 }}
            title="All Categories"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setCategoryFilter('Consultation')}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, border: categoryFilter === 'Consultation' ? '1.5px solid #0369a1' : '1.5px solid var(--gray-200)', background: categoryFilter === 'Consultation' ? '#e0f2fe' : '#fff', color: categoryFilter === 'Consultation' ? '#0369a1' : 'var(--gray-600)', padding: 0 }}
            title="Consultation"
          >
            <Stethoscope size={16} />
          </button>
          <button
            onClick={() => setCategoryFilter('Lab')}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, border: categoryFilter === 'Lab' ? '1.5px solid #0369a1' : '1.5px solid var(--gray-200)', background: categoryFilter === 'Lab' ? '#e0f2fe' : '#fff', color: categoryFilter === 'Lab' ? '#0369a1' : 'var(--gray-600)', padding: 0 }}
            title="Lab"
          >
            <FlaskConical size={16} />
          </button>
          <button
            onClick={() => setCategoryFilter('Day Care')}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, border: categoryFilter === 'Day Care' ? '1.5px solid #0369a1' : '1.5px solid var(--gray-200)', background: categoryFilter === 'Day Care' ? '#e0f2fe' : '#fff', color: categoryFilter === 'Day Care' ? '#0369a1' : 'var(--gray-600)', padding: 0 }}
            title="Day Care"
          >
            <PlusSquare size={16} />
          </button>
          <button
            onClick={() => setCategoryFilter('Home Care')}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, border: categoryFilter === 'Home Care' ? '1.5px solid #0369a1' : '1.5px solid var(--gray-200)', background: categoryFilter === 'Home Care' ? '#e0f2fe' : '#fff', color: categoryFilter === 'Home Care' ? '#0369a1' : 'var(--gray-600)', padding: 0 }}
            title="Home Care"
          >
            <Info size={16} />
          </button>
        </div>

        {/* Status filters */}
        <div className="status-tabs d-flex align-items-center flex-shrink-0">
          {statusOptions.map(s => (
            <button
              key={s}
              className={`status-tab text-nowrap ${statusFilter === s ? `active ${s.toLowerCase().replace('-', '')}` : ''}`}
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
            <div className="position-relative flex-shrink-0" style={{ zIndex: 200 }}>
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

        <div className="ms-auto d-flex align-items-center gap-2 flex-shrink-0">
          {/* Lab Orders button matching the original app's toolbar */}
          <button 
            className="btn btn-sm d-flex align-items-center justify-content-center flex-shrink-0" 
            style={{ width: 38, height: 38, borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-600)', flexShrink: 0 }}
            title="Lab Orders / Payments" 
            onClick={() => window.location.href = '/lab'}
          >
            <Microscope size={18} />
          </button>

          {/* Date picker */}
          <div className="d-flex align-items-center gap-1" style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)', height: 38, flexShrink: 0 }}>
            <CalendarIcon size={14} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
            <input
              type="date"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--gray-800)', width: '110px' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          <button className="btn-hp-ghost flex-shrink-0" onClick={() => setDateFilter(getLocalDateString())}>
            Today
          </button>
          <button className="btn-hp-primary flex-shrink-0" onClick={() => setShowNewAppt(true)}>
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
      <div className="flex-grow-1 overflow-auto w-100" style={{ background: '#fff' }}>
        <table className="hp-table w-100">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Age</th>
              <th>Q. No</th>
              <th>Time</th>
              <th>Doctor</th>
              <th>Service</th>
              <th>Next Visit</th>
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
              <tr><td colSpan={10} className="text-center py-5 text-secondary">
                <RefreshCw size={18} className="spin me-2" />Loading…
              </td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-5">
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
                  <tr key={appt._id} style={{ opacity: appt.status === 'CANCELLED' ? 0.55 : 1, background: appt.isPriority ? '#fff1f2' : undefined, borderLeft: appt.isPriority ? '4px solid #ef4444' : undefined }}>
                    <td style={{ color: 'var(--gray-400)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {appt.patient?.patientId || `#${appt._id?.slice(-5)}`}
                    </td>
                    <td>
                      <div
                        className="d-flex align-items-center gap-2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedDashboardApptId(appt._id);
                          setSelectedDashboardPatient(appt.patient);
                        }}
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
                    <td style={{ fontWeight: 700, fontSize: '0.92rem', color: appt.isPriority ? '#b91c1c' : undefined }}>
                      #{appt.queueNumber ?? (idx + 1)}
                      {appt.isPriority && <span style={{fontSize:'0.62rem', padding:'1px 5px', background:'#ef4444', color:'white', borderRadius:4, marginLeft:6, verticalAlign:'middle'}}>VIP</span>}
                    </td>
                    <td style={{ color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.85rem' }}>
                      {appt.time ? formatTime(appt.time) : '—'}
                    </td>
                    <td style={{ color: 'var(--gray-600)' }}>{appt.doctorName || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.service || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {appt.followUpDate ? new Date(appt.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    {/* ── Bill column: 🖨️ + colored amount ── */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <BillCell 
                        appt={appt} 
                        onPaymentClick={setSelectedBillForPayment}
                        onPrintClick={handlePrintBill}
                      />
                    </td>
                    <td>
                      <select
                        className={`status-badge ${st.cls} form-select-sm border-0`}
                        style={{ appearance: 'none', cursor: 'pointer', paddingRight: '20px', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                        value={appt.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await frontdeskService.updateAppointmentStatus(appt._id, newStatus);
                            // The websocket 'APPOINTMENT_STATUS_CHANGED' or 'APPOINTMENT_UPDATED' should refresh the list automatically.
                          } catch (error) {
                            alert('Failed to update status');
                          }
                        }}
                      >
                        <option value="BOOKED">Booked</option>
                        <option value="ARRIVED">Arrived</option>
                        <option value="ON-GOING">On-Going</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
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
                            <div className="hp-dropdown-item" onClick={() => { 
                              window.open(`/doctor/visit/${appt._id}/print?preview=true`, '_blank');
                              setDropdownOpenId(null); 
                            }}>
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
                              setMergePatient({ id: appt.patient?.patientId || appt.patient?._id, name: appt.patient?.name });
                              setDropdownOpenId(null);
                            }}>
                              <Receipt size={15} style={{ color: '#3b82f6' }} /> All Bills
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
                              setSelectedApptForEdit(appt);
                            }}>
                              <Edit2 size={15} style={{ color: '#0ea5e9' }} /> Edit Details
                            </div>
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
                            <div className="hp-dropdown-item" onClick={() => {
                              setDropdownOpenId(null);
                              deleteAppt(appt);
                            }} style={{ color: '#991b1b' }}>
                              <Trash2 size={15} style={{ color: '#991b1b' }} /> Delete
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

      {selectedApptForEdit && (
        <NewAppointmentModal
          onClose={() => setSelectedApptForEdit(null)}
          onSuccess={() => { setSelectedApptForEdit(null); fetchAppointments(); }}
          editData={{
            _id: selectedApptForEdit._id,
            patientName: selectedApptForEdit.patient?.name || '',
            phone: selectedApptForEdit.patient?.phone || '',
            email: selectedApptForEdit.patient?.email || '',
            age: selectedApptForEdit.patient?.age || '',
            gender: selectedApptForEdit.patient?.gender || '',
            bloodGroup: selectedApptForEdit.patient?.bloodGroup || '',
            referredByDoctor: selectedApptForEdit.referredByDoctor || '',
            doctorName: selectedApptForEdit.doctorName || '',
            queueNumber: selectedApptForEdit.queueNumber || '',
            status: selectedApptForEdit.status || 'BOOKED',
            duration: selectedApptForEdit.duration || '5 mins',
            date: selectedApptForEdit.date,
            time: selectedApptForEdit.time,
            service: selectedApptForEdit.service,
          }}
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

      {mergePatient && (
        <MergeBillModal
          show={true}
          onClose={() => setMergePatient(null)}
          patientId={mergePatient.id}
          patientName={mergePatient.name}
        />
      )}
    </div>
  );
};

export default Dashboard;
