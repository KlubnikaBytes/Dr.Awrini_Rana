import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import doctorService from '../../services/doctorService';
import clinicService from '../../services/clinicService';
import useWebSocket from '../../hooks/useWebSocket';
import { getLocalDateString } from '../../utils/dateUtils';
import {  Microscope, Search, Plus, Printer, User, Calendar, Clock,
  CheckCircle, XCircle, Activity, Loader, RefreshCw, Edit3, X,
  FileText, Beaker, AlertCircle, ChevronRight, BarChart2, Trash2,
  DollarSign, CreditCard, Receipt, IndianRupee, Banknote, BadgePercent, Wallet, Mail
} from 'lucide-react';
import { sendDocumentAsEmail } from '../../services/emailService';


/* ─── Constants ─── */
const API = `${import.meta.env.VITE_API_URL}/laborders/`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'x-clinic-id': localStorage.getItem('clinicId') } });

const CAT_COLORS = {
  'HAEMATOLOGY':'#dc2626','BIO CHEMISTRY':'#d97706','LIPID PROFILE':'#7c3aed',
  'KIDNEY FUNCTION TEST':'#2563eb','LIVER FUNCTION TEST':'#059669','UACR':'#0891b2',
  'URINE ROUTINE':'#7e22ce','THYROID FUNCTION TEST':'#b45309',
  'PCOS / Infertility':'#be185d','OTHERS':'#475569'
};

const STATUS_CFG = {
  'Registered':       { color:'#3b82f6', bg:'#dbeafe', label:'Registered' },
  'Sample Collected': { color:'#d97706', bg:'#fef3c7', label:'Sample Collected' },
  'Processing':       { color:'#7c3aed', bg:'#ede9fe', label:'Processing' },
  'Completed':        { color:'#059669', bg:'#d1fae5', label:'Completed' },
};

const PRIORITY_CFG = {
  'Routine': { color:'#64748b', bg:'#f1f5f9' },
  'Urgent':  { color:'#d97706', bg:'#fef3c7' },
  'STAT':    { color:'#dc2626', bg:'#fee2e2' },
};

const fmt    = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDt  = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const parseUnit = name => { const m=name.match(/\(([^)]+)\)$/); return m?m[1]:''; };

const generateLabBillHTML = (order, clinicName, clinicPhone, clinicLogo) => {
  const rows = (order.tests || []).filter(t => t.unitPrice > 0 || t.discount > 0 || t.tax > 0 || t.totalPrice > 0).map((item, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${i+1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${parseFloat(item.unitPrice||0).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.tax || 0}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-₹${parseFloat(item.discount||0).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1d4ed8">₹${parseFloat(item.totalPrice||0).toFixed(2)}</td>
    </tr>`).join('');

  const paymentsRows = (order.payments || []).map((p,i) => `
    <tr>
      <td style="padding:6px 12px;font-size:12px">${i+1}. ${new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
      <td style="padding:6px 12px;font-size:12px">${p.paymentMode}</td>
      <td style="padding:6px 12px;font-size:12px">${p.note || 'Payment'}</td>
      <td style="padding:6px 12px;font-size:12px;font-weight:700;color:#059669">₹${parseFloat(p.amount).toFixed(2)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><title>Lab Bill - ${order.patientName}</title>
  <style>
    body{font-family:'Segoe UI', Arial, sans-serif;margin:0;padding:40px 50px;color:#111;}
    @media print { body { padding: 15px 25px; } }
    table{width:100%;border-collapse:collapse}
    th{background:#1e293b;padding:12px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#fff;letter-spacing:1px}
    td{padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;}
  </style></head><body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #2563eb">
    <div style="display:flex;flex-direction:column;align-items:flex-start">
      ${clinicLogo ? `<img src="${clinicLogo}" style="max-height:90px;max-width:240px;object-fit:contain;margin-bottom:12px" />` : `<div style="font-size:2rem;font-weight:900;color:#1d4ed8;font-style:italic;margin-bottom:12px;">${clinicName}</div>`}
      <div style="display:flex;align-items:center;gap:8px;font-size:1.25rem;font-weight:800;color:#000">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        ${clinicPhone}
      </div>
    </div>
    <div style="text-align:right">
      <h2 style="margin:0;color:#1d4ed8;font-size:2.2rem;font-weight:900;text-transform:uppercase;letter-spacing:0.5px">${clinicName}</h2>
      <div style="color:#64748b;font-size:1.1rem;margin-top:4px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Laboratory Invoice / Receipt</div>
      <div style="color:#64748b;font-size:13px;margin-top:12px">Bill No: ${order._id?.slice(-6).toUpperCase()}</div>
      <div style="color:#64748b;font-size:13px;margin-top:2px">Date: ${new Date(order.billDate||order.orderedDate||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
      <div style="color:#64748b;font-size:13px;margin-top:4px">Status: <b style="color:${(order.balanceAmount||0)>0?'#dc2626':'#059669'}">${(order.balanceAmount||0)>0?'UNPAID':'PAID'}</b></div>
    </div>
  </div>

  <!-- Patient Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:30px;padding:20px 24px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
    <div>
      <div style="font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px">Patient Details</div>
      <div style="font-weight:700;font-size:15px;color:#0f172a">${order.patientName||'—'}</div>
      <div style="color:#0f172a;margin-top:2px;font-size:14px">${order.patientGender||''} · ${order.patientAge||''} yrs</div>
      <div style="color:#0f172a;font-size:14px">${order.patientPhone||''}</div>
      <div style="color:#0f172a;font-size:14px">ID / UHID: ${order.uhid||order.patientId||order._id?.slice(-6).toUpperCase()||''}</div>
    </div>
    <div>
      <div style="font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px">Amount Summary</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px;color:#0f172a"><span>Total Billed</span><span>₹${parseFloat(order.totalBilledAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px;color:#dc2626"><span>Discount</span><span>-₹${parseFloat(order.totalDiscount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px;color:#059669"><span>GST</span><span>+₹${parseFloat(order.totalTax||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;padding-top:6px;border-top:1px solid #e2e8f0;color:#1d4ed8"><span>Final Amount</span><span>₹${parseFloat(order.finalAmount||0).toFixed(2)}</span></div>
    </div>
  </div>

  <!-- Items Table -->
  <table style="margin-bottom:40px">
    <thead><tr><th>#</th><th>Test Name</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  ${(order.payments||[]).length > 0 ? `
  <!-- Payments -->
  <div style="margin-bottom:40px">
    <div style="font-weight:700;margin-bottom:12px;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Payment History</div>
    <table><thead><tr><th>Date</th><th>Mode</th><th>Note</th><th>Amount</th></tr></thead>
    <tbody>${paymentsRows}</tbody></table>
    <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#f0fdf4;border-radius:6px;margin-top:12px;font-weight:700;font-size:14px">
      <span style="color:#059669">Total Received</span><span style="color:#059669">₹${parseFloat(order.receivedAmount||0).toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:12px 16px;background:${(order.balanceAmount||0)>0?'#fef2f2':'#f0fdf4'};border-radius:6px;margin-top:6px;font-weight:700;font-size:15px">
      <span style="color:${(order.balanceAmount||0)>0?'#dc2626':'#059669'}">Balance Due</span>
      <span style="color:${(order.balanceAmount||0)>0?'#dc2626':'#059669'}">₹${parseFloat(order.balanceAmount||0).toFixed(2)}</span>
    </div>
  </div>` : ''}

  <div style="margin-top:50px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
    Computer-generated invoice
    <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
  </div>
  </body></html>`;
};

const printLabBill = async (order) => {
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const storedClinicId = localStorage.getItem('clinicId') || '';
  const storedClinicName = localStorage.getItem('clinicName') || '';
  let clinicLogo = null;
  let clinicPhone = '9002535240';
  let clinicName = storedClinicName || 'mediplix';

  try {
    const all = await clinicService.getAllClinics();
    const clinicData = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;
    if (clinicData) {
      clinicName = clinicData.name || clinicName;
      clinicPhone = clinicData.phone || clinicPhone;
      const rawLogoPath = clinicData.logo || null;
      clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;
    }
  } catch (err) {}

  const html = generateLabBillHTML(order, clinicName, clinicPhone, clinicLogo);
  let iframe = document.getElementById('lab-bill-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'lab-bill-print-frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(iframe);
  }
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); };
  setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e){} }, 700);
};

const emailLabBill = async (order) => {
  let targetEmail = order.patientEmail;
  if (!targetEmail) {
    targetEmail = window.prompt("Patient does not have a registered email address. Please enter an email address to send the bill:");
    if (!targetEmail) return;
    try {
      await axios.put(`${API}${order._id}`, { patientEmail: targetEmail }, cfg());
    } catch(err) { console.error("Could not save email", err); }
  } else {
    const newEmail = window.prompt("Confirm or change the email address to send the bill:", targetEmail);
    if (!newEmail) return;
    if (newEmail !== targetEmail) {
      targetEmail = newEmail;
      try {
        await axios.put(`${API}${order._id}`, { patientEmail: targetEmail }, cfg());
      } catch(err) { console.error("Could not save email", err); }
    }
  }

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const storedClinicId = localStorage.getItem('clinicId') || '';
  const storedClinicName = localStorage.getItem('clinicName') || '';
  let clinicLogo = null;
  let clinicPhone = '9002535240';
  let clinicName = storedClinicName || 'mediplix';

  try {
    const all = await clinicService.getAllClinics();
    const clinicData = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;
    if (clinicData) {
      clinicName = clinicData.name || clinicName;
      clinicPhone = clinicData.phone || clinicPhone;
      const rawLogoPath = clinicData.logo || null;
      clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;
    }
  } catch (err) {}

  const html = generateLabBillHTML(order, clinicName, clinicPhone, clinicLogo);
  const subject = `Your Lab Bill from ${clinicName}`;
  const body = `<p>Dear ${order.patientName},</p><p>Please find attached your lab bill.</p>`;

  try {
    await sendDocumentAsEmail(html, targetEmail, subject, body, 'Lab_Bill.pdf');
    alert(`Email successfully sent to ${targetEmail}`);
  } catch (err) {
    console.error("Error sending email:", err);
    alert('Failed to send email. Ensure backend is configured properly.');
  }
};

const emailLabReport = async (order) => {
  const done = (order.tests||[]).filter(t=>t.value).length;
  if (done === 0) { alert('No results entered yet for this order.'); return; }
  
  let targetEmail = order.patientEmail;
  if (!targetEmail) {
    targetEmail = window.prompt("Patient does not have a registered email address. Please enter an email address to send the report:");
    if (!targetEmail) return;
    try {
      await axios.put(`${API}${order._id}`, { patientEmail: targetEmail }, cfg());
    } catch(err) { console.error("Could not save email", err); }
  } else {
    const newEmail = window.prompt("Confirm or change the email address to send the report:", targetEmail);
    if (!newEmail) return;
    if (newEmail !== targetEmail) {
      targetEmail = newEmail;
      try {
        await axios.put(`${API}${order._id}`, { patientEmail: targetEmail }, cfg());
      } catch(err) { console.error("Could not save email", err); }
    }
  }
  
  try {
    const storedClinicId = localStorage.getItem('clinicId') || '';
    const storedClinicName = localStorage.getItem('clinicName') || '';
    const all = await clinicService.getAllClinics().catch(() => []);
    const clinicData = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const clinicName = clinicData?.name || storedClinicName || 'mediplix';
    const clinicPhone = clinicData?.phone || '9002535240';
    const rawLogoPath = clinicData?.logo || null;
    const clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;

    const grouped2 = {};
    (order.tests||[]).forEach(t=>{ if(!grouped2[t.category]) grouped2[t.category]=[]; grouped2[t.category].push(t); });
    const rows = Object.entries(grouped2).map(([cat,tests])=>
      `<tr><td colspan="3" class="cat-row">${cat}</td></tr>`+
      tests.map(t=>`<tr><td>${t.name}</td><td style="text-align:center;font-weight:700;">${t.value||'Pending'}</td><td style="text-align:center;color:#64748b;">${t.unit||'—'}</td></tr>`).join('')
    ).join('');

    const html=`<!DOCTYPE html><html><head><title>Lab Report - ${order.patientName}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px 50px; color: #111; }
      .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
      .header-left { text-align: left; display: flex; flex-direction: column; align-items: flex-start; }
      .header-right { text-align: right; }
      .logo { max-height: 90px; max-width: 240px; object-fit: contain; margin-bottom: 12px; }
      .phone-box { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; font-weight: 800; color: #000; }
      .clinic-title { font-size: 2.2rem; font-weight: 900; color: #1d4ed8; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
      .clinic-sub { font-size: 1.1rem; color: #64748b; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
      
      .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; padding: 20px 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 14px; }
      .patient-grid div { display: flex; flex-direction: column; }
      .patient-grid strong { color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
      .patient-grid span { font-weight: 700; color: #0f172a; font-size: 15px; }

      table { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
      th { background: #1e293b; color: #fff; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
      td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; }
      .cat-row { background: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #cbd5e1; padding-top: 16px; padding-bottom: 16px;}
      
      .footer { margin-top: 80px; display: flex; justify-content: flex-end; }
      .signature { text-align: center; border-top: 2px solid #000; padding-top: 10px; min-width: 220px; font-weight: 700; font-size: 15px; }
    </style>
    </head><body>
      <div class="header">
        <div class="header-left">
          ${clinicLogo ? `<img class="logo" src="${clinicLogo}" />` : `<div style="font-size:2rem;font-weight:900;color:#1d4ed8;font-style:italic;margin-bottom:12px;">${clinicName}</div>`}
          <div class="phone-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            ${clinicPhone}
          </div>
        </div>
        <div class="header-right">
          <h2 class="clinic-title">${clinicName}</h2>
          <div class="clinic-sub">Laboratory Investigation Report</div>
        </div>
      </div>
      <div class="patient-grid">
        <div><strong>Patient</strong> <span>${order.patientName}</span></div>
        <div><strong>ID / UHID</strong> <span>${order.uhid||order.patientId||'—'}</span></div>
        <div><strong>Age / Gender</strong> <span>${order.patientAge||'—'} yrs / ${order.patientGender}</span></div>
        <div><strong>Phone</strong> <span>${order.patientPhone||'—'}</span></div>
        <div><strong>Referred By</strong> <span>${order.referredBy||'—'}</span></div>
        <div><strong>Date</strong> <span>${new Date(order.orderedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
        <div><strong>Sample</strong> <span>${order.sampleType}</span></div>
        <div><strong>Priority</strong> <span>${order.priority}</span></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th style="text-align:center">Result</th>
            <th style="text-align:center">Unit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="signature">Doctor's Signature</div>
      </div>
      <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
        Computer-generated report
        <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
      </div>
    </body></html>`;
    
    const subject = `Your Lab Report from ${clinicName}`;
    const body = `<p>Dear ${order.patientName},</p><p>Please find attached your laboratory investigation report.</p>`;
    
    await sendDocumentAsEmail(html, targetEmail, subject, body, 'Lab_Report.pdf');
    alert(`Email successfully sent to ${targetEmail}`);
  } catch (err) {
    console.error("Error sending email:", err);
    alert('Failed to send email. Ensure backend is configured properly.');
  }
};

/* ─── Step 1: Register Patient ───────────────────────────────── */
const RegisterModal = ({ onSave, onClose, catalog }) => {
  const [form, setForm] = useState({
    patientName:'', patientAge:'', patientGender:'Male', patientPhone:'', email:'',
    uhid:'', referredBy:'', sampleType:'Blood', priority:'Routine',
    orderedDate: getLocalDateString(), notes:''
  });
  const [step, setStep] = useState(1); // 1=patient info, 2=test selection
  const [selectedTests, setSelectedTests] = useState({});
  const [activecat, setActivecat] = useState('HAEMATOLOGY');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [customTests, setCustomTests] = useState({});

  const catalogWithCustom = useMemo(() => {
    const merged = { ...catalog };
    for (const [cat, tests] of Object.entries(customTests)) {
      if (merged[cat]) {
        merged[cat] = [...merged[cat], ...tests];
      } else {
        merged[cat] = [...tests];
      }
    }
    return merged;
  }, [catalog, customTests]);

  const toggleTest = (cat, name) => {
    const key = `${cat}||${name}`;
    setSelectedTests(s => {
      const n = { ...s };
      if (n[key]) delete n[key]; else n[key] = { category: cat, name, value: '', unit: parseUnit(name), status: 'Pending' };
      return n;
    });
  };

  const totalSelected = Object.keys(selectedTests).length;

  const filteredTests = search
    ? Object.entries(catalogWithCustom).flatMap(([cat, tests]) =>
        tests.filter(t => t.toLowerCase().includes(search.toLowerCase())).map(t => ({ cat, t }))
      )
    : catalogWithCustom[activecat]?.map(t => ({ cat: activecat, t })) || [];

  const handleSubmit = async () => {
    if (totalSelected === 0) return alert('Please select at least one test');
    setSaving(true);
    try {
      const tests = Object.values(selectedTests);
      const payload = { ...form, patientEmail: form.email, tests, orderedDate: new Date(form.orderedDate), status: 'Registered' };
      await onSave(payload);
    } finally { setSaving(false); }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor:'rgba(15,23,42,0.65)', zIndex:1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth:900 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius:16, overflow:'hidden' }}>

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-2 d-flex align-items-center justify-content-center" style={{ width:40, height:40 }}>
                <Microscope size={20} className="text-white"/>
              </div>
              <div>
                <div className="text-white fw-bold">New Lab Registration</div>
                <div className="text-white small opacity-75">Step {step} of 2 — {step===1?'Patient Details':'Select Tests'}</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              {totalSelected > 0 && <span className="badge bg-success rounded-pill px-3 py-2">{totalSelected} test{totalSelected>1?'s':''} selected</span>}
              <button className="btn text-white p-2" style={{ borderRadius:10, border:'1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}><X size={16}/></button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="d-flex border-bottom" style={{ backgroundColor:'#f8fafc' }}>
            {[{n:1,label:'Patient Details'},{n:2,label:'Select Tests'}].map(s=>(
              <button key={s.n} className="btn btn-sm py-3 px-4 border-0 rounded-0 fw-semibold"
                style={{ fontSize:'0.82rem', color:step===s.n?'#2563eb':'#64748b',
                  borderBottom:step===s.n?'3px solid #2563eb':'3px solid transparent',
                  backgroundColor:'transparent' }}
                onClick={()=>setStep(s.n)}>
                <span className="me-2 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{ width:22, height:22, backgroundColor:step===s.n?'#2563eb':'#e2e8f0', color:step===s.n?'#fff':'#64748b', fontSize:'0.75rem', fontWeight:700 }}>
                  {s.n}
                </span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="modal-body p-0 bg-white" style={{ maxHeight:'65vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>

            {/* Step 1: Patient Info */}
            {step === 1 && (
              <div className="p-4 overflow-auto flex-grow-1">
                <div className="row g-3">
                  {[
                    {label:'Patient Full Name *',name:'patientName',ph:'Full name',half:true},
                    {label:'UHID / Patient ID',name:'uhid',ph:'Optional',half:true},
                    {label:'Age',name:'patientAge',ph:'e.g. 45',half:true},
                    {label:'Email',name:'email',ph:'Email address',half:true},
                  ].map(f=>(
                    <div key={f.name} className={f.half?'col-md-6':'col-12'}>
                      <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>{f.label}</label>
                      <input className="form-control shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }}
                        name={f.name} value={form[f.name]} placeholder={f.ph}
                        onChange={e=>setForm(x=>({...x,[e.target.name]:e.target.value}))}/>
                    </div>
                  ))}
                  {/* Phone with 10-digit enforcement */}
                  <div className="col-md-6">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Phone</label>
                    <input
                      className="form-control shadow-none"
                      style={{ border:`1.5px solid ${form.patientPhone && form.patientPhone.length > 0 && form.patientPhone.length < 10 ? '#ef4444' : '#e2e8f0'}`, borderRadius:8, fontSize:'0.88rem' }}
                      type="tel" maxLength={10}
                      name="patientPhone" value={form.patientPhone} placeholder="10-digit number"
                      onChange={e=>setForm(x=>({...x,patientPhone:e.target.value.replace(/\D/g,'').slice(0,10)}))}
                    />
                    {form.patientPhone && form.patientPhone.length > 0 && form.patientPhone.length < 10 && (
                      <div style={{ fontSize:'0.72rem', color:'#ef4444', marginTop:2 }}>{10 - form.patientPhone.length} more digit{10 - form.patientPhone.length !== 1 ? 's' : ''} required</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Gender</label>
                    <select className="form-select shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }} name="patientGender" value={form.patientGender} onChange={e=>setForm(x=>({...x,patientGender:e.target.value}))}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Referred By (Doctor)</label>
                    <input className="form-control shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }}
                      name="referredBy" value={form.referredBy} placeholder="Dr. Name"
                      onChange={e=>setForm(x=>({...x,referredBy:e.target.value}))}/>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Sample Type</label>
                    <select className="form-select shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }} name="sampleType" value={form.sampleType} onChange={e=>setForm(x=>({...x,sampleType:e.target.value}))}>
                      {['Blood','Urine','Stool','Sputum','Swab','Other'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Priority</label>
                    <select className="form-select shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }} name="priority" value={form.priority} onChange={e=>setForm(x=>({...x,priority:e.target.value}))}>
                      <option>Routine</option><option>Urgent</option><option>STAT</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Order Date</label>
                    <input type="date" className="form-control shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }}
                      name="orderedDate" value={form.orderedDate} onChange={e=>setForm(x=>({...x,orderedDate:e.target.value}))}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>Notes</label>
                    <textarea className="form-control shadow-none" rows={2} style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem', resize:'none' }}
                      name="notes" value={form.notes} placeholder="Clinical notes, fasting status, etc."
                      onChange={e=>setForm(x=>({...x,notes:e.target.value}))}/>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Test Selection */}
            {step === 2 && (
              <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Category Sidebar */}
                <div className="d-flex flex-column border-end" style={{ width:200, flexShrink:0 }}>
                  <div className="p-2 border-bottom">
                    <input className="form-control form-control-sm shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8 }}
                      placeholder="Search tests..." value={search} onChange={e=>setSearch(e.target.value)}/>
                  </div>
                  <div className="overflow-auto flex-grow-1">
                    {Object.keys(catalogWithCustom).map(cat=>{
                      const selCount = Object.keys(selectedTests).filter(k=>k.startsWith(cat+'||')).length;
                      return (
                        <div key={cat}
                          className="px-3 py-2 d-flex align-items-center justify-content-between"
                          style={{ cursor:'pointer', backgroundColor:!search&&activecat===cat?'#eff6ff':'transparent', borderLeft:!search&&activecat===cat?`3px solid ${CAT_COLORS[cat]||'#2563eb'}`:'3px solid transparent', borderBottom:'1px solid #f1f5f9', fontSize:'0.78rem', fontWeight:600, color:!search&&activecat===cat?CAT_COLORS[cat]:'#374151' }}
                          onClick={()=>{setActivecat(cat);setSearch('');}}>
                          <span>{cat}</span>
                          {selCount>0&&<span className="badge rounded-pill" style={{ backgroundColor:CAT_COLORS[cat], color:'#fff', fontSize:'0.65rem' }}>{selCount}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Test List */}
                <div className="flex-grow-1 overflow-auto p-3">
                  <div className="mb-2 d-flex align-items-center gap-2">
                    <div className="fw-bold" style={{ color: CAT_COLORS[activecat]||'#2563eb', fontSize:'0.85rem' }}>{search?'Search Results':activecat}</div>
                    {!search&&<div className="ms-auto d-flex gap-2">
                      <button className="btn btn-sm" style={{ fontSize:'0.72rem', color:'#059669', border:'1px solid #a7f3d0', borderRadius:6, padding:'2px 10px', backgroundColor:'#ecfdf5' }}
                        onClick={()=>{
                          const testName = window.prompt(`Enter new custom test name for ${activecat}:`);
                          if (testName && testName.trim()) {
                             const name = testName.trim();
                             setCustomTests(prev => ({ ...prev, [activecat]: [...(prev[activecat]||[]), name] }));
                             // Also pre-select it
                             setSelectedTests(s => ({ ...s, [`${activecat}||${name}`]: { category: activecat, name, value: '', unit: parseUnit(name), status: 'Pending' } }));
                          }
                        }}>
                        + Add Custom Test
                      </button>
                      <button className="btn btn-sm" style={{ fontSize:'0.72rem', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 10px' }}
                        onClick={()=>{
                          const cats=search?[...new Set(filteredTests.map(x=>x.cat))]:[[activecat]];
                          const cat=activecat;
                          const allSelected=catalogWithCustom[cat].every(t=>selectedTests[`${cat}||${t}`]);
                          const n={...selectedTests};
                          catalogWithCustom[cat].forEach(t=>{
                            const k=`${cat}||${t}`;
                            if(allSelected) delete n[k]; else n[k]={category:cat,name:t,value:'',unit:parseUnit(t),status:'Pending'};
                          });
                          setSelectedTests(n);
                        }}>
                        {catalogWithCustom[activecat].every(t=>selectedTests[`${activecat}||${t}`])?'Deselect All':'Select All'}
                      </button>
                    </div>}
                  </div>
                  <div className="d-flex flex-column gap-1">
                    {filteredTests.map(({cat,t})=>{
                      const key=`${cat}||${t}`;
                      const checked=!!selectedTests[key];
                      return (
                        <label key={key} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ cursor:'pointer', backgroundColor:checked?(CAT_COLORS[cat]||'#2563eb')+'12':'transparent', border:checked?`1px solid ${CAT_COLORS[cat]||'#2563eb'}30`:'1px solid transparent', transition:'all 0.15s' }}>
                          <input type="checkbox" className="form-check-input m-0 flex-shrink-0" checked={checked} onChange={()=>toggleTest(cat,t)} style={{ accentColor: CAT_COLORS[cat]||'#2563eb', width:16, height:16 }}/>
                          <span className="flex-grow-1" style={{ fontSize:'0.83rem', color: checked?(CAT_COLORS[cat]||'#1d4ed8'):'#374151', fontWeight: checked?600:400 }}>{t}</span>
                          {search&&<span className="badge px-2" style={{ backgroundColor:(CAT_COLORS[cat]||'#475569')+'20', color:CAT_COLORS[cat]||'#475569', fontSize:'0.65rem' }}>{cat.split(' ')[0]}</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Selected summary */}
                {totalSelected > 0 && (
                  <div className="d-flex flex-column border-start" style={{ width:180, flexShrink:0 }}>
                    <div className="p-2 border-bottom fw-bold text-dark" style={{ fontSize:'0.78rem' }}>Selected ({totalSelected})</div>
                    <div className="overflow-auto flex-grow-1 p-2">
                      {Object.values(selectedTests).map((t,i)=>(
                        <div key={i} className="d-flex align-items-start gap-1 mb-2 p-2 rounded-2" style={{ backgroundColor:(CAT_COLORS[t.category]||'#475569')+'12', fontSize:'0.72rem' }}>
                          <span className="flex-grow-1" style={{ color:CAT_COLORS[t.category]||'#475569', lineHeight:1.3 }}>{t.name}</span>
                          <button className="btn p-0 border-0 bg-transparent" style={{ color:'#94a3b8', flexShrink:0 }} onClick={()=>toggleTest(t.category,t.name)}><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ backgroundColor:'#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>Cancel</button>
            <div className="d-flex gap-2">
              {step===2&&<button type="button" className="btn btn-outline-primary rounded-pill px-4" onClick={()=>setStep(1)}>← Back</button>}
              {step===1&&<button type="button" className="btn rounded-pill px-5 fw-bold" style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', border:'none' }}
                onClick={()=>{ if(!form.patientName.trim()) return alert('Patient name is required'); setStep(2); }}>
                Next: Select Tests →
              </button>}
              {step===2&&<button type="button" disabled={saving||totalSelected===0} className="btn rounded-pill px-5 fw-bold" style={{ background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', border:'none' }} onClick={handleSubmit}>
                {saving?<><span className="spinner-border spinner-border-sm me-2"/>Registering...</>:'Register & Save'}
              </button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Enter Results Modal ─────────────────────────────────────── */
const EnterResultsModal = ({ order, onSave, onClose }) => {
  const [tests, setTests] = useState(order.tests.map(t=>({...t})));
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);

  const setVal = (i,v) => setTests(ts=>{ const n=[...ts]; n[i]={...n[i],value:v,status:v?'Done':'Pending'}; return n; });

  const handleSave = async () => {
    setSaving(true);
    try {
      const allDone = tests.every(t=>t.value);
      await onSave({ tests, status: allDone?'Completed':status });
    } finally { setSaving(false); }
  };

  const grouped = {};
  tests.forEach((t,i)=>{ if(!grouped[t.category]) grouped[t.category]=[]; grouped[t.category].push({...t,idx:i}); });
  const done = tests.filter(t=>t.value).length;

  return (
    <div className="modal d-block" style={{ backgroundColor:'rgba(15,23,42,0.65)', zIndex:1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius:16, overflow:'hidden' }}>
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background:'linear-gradient(135deg,#064e3b,#059669)' }}>
            <div>
              <div className="text-white fw-bold">{order.patientName} — Enter Results</div>
              <div className="text-white small opacity-75">{done}/{tests.length} results filled · {fmt(order.orderedDate)}</div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white rounded-pill px-3 py-1" style={{ fontSize:'0.8rem', color:'#059669' }}>
                <strong>{Math.round(done/tests.length*100)||0}%</strong> complete
              </div>
              <select className="form-select form-select-sm shadow-none" style={{ width:160, borderRadius:8, border:'1.5px solid rgba(255,255,255,0.3)', backgroundColor:'rgba(255,255,255,0.15)', color:'#fff', fontSize:'0.82rem' }}
                value={status} onChange={e=>setStatus(e.target.value)}>
                {['Registered','Sample Collected','Processing','Completed'].map(s=><option key={s} style={{ color:'#000' }}>{s}</option>)}
              </select>
              <button className="btn text-white p-2" style={{ borderRadius:10, border:'1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}><X size={16}/></button>
            </div>
          </div>

          <div className="modal-body p-0" style={{ maxHeight:'65vh', overflowY:'auto' }}>
            {Object.entries(grouped).map(([cat,items])=>(
              <div key={cat} className="border-bottom">
                <div className="px-4 py-2 d-flex align-items-center gap-2 sticky-top bg-white" style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <div className="rounded-2 px-3 py-1 fw-bold text-white" style={{ backgroundColor:CAT_COLORS[cat]||'#475569', fontSize:'0.72rem' }}>{cat}</div>
                  <span className="text-secondary small">{items.filter(t=>t.value).length}/{items.length} done</span>
                </div>
                <div className="px-4 py-2">
                  <table className="table table-sm table-borderless mb-0" style={{ fontSize:'0.85rem' }}>
                    <thead><tr style={{ backgroundColor:'#f8fafc' }}>
                      <th className="py-2 text-secondary fw-semibold" style={{ fontSize:'0.72rem', textTransform:'uppercase' }}>Test Name</th>
                      <th className="py-2 text-secondary fw-semibold" style={{ fontSize:'0.72rem', textTransform:'uppercase', width:150 }}>Result</th>
                      <th className="py-2 text-secondary fw-semibold" style={{ fontSize:'0.72rem', textTransform:'uppercase', width:80 }}>Unit</th>
                      <th className="py-2" style={{ width:40 }}></th>
                    </tr></thead>
                    <tbody>
                      {items.map(t=>(
                        <tr key={t.idx} style={{ borderBottom:'1px solid #f8fafc' }}>
                          <td className="py-2 align-middle text-dark">{t.name}</td>
                          <td className="py-2 align-middle">
                            <input className="form-control form-control-sm shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:6 }}
                              value={t.value} placeholder="Enter value" onChange={e=>setVal(t.idx,e.target.value)}/>
                          </td>
                          <td className="py-2 align-middle text-secondary" style={{ fontSize:'0.78rem' }}>{t.unit||'—'}</td>
                          <td className="py-2 align-middle text-center">
                            {t.value && <CheckCircle size={14} style={{ color:'#059669' }}/>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ backgroundColor:'#f8fafc' }}>
            <span className="text-secondary small">{done} of {tests.length} results entered</span>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>Cancel</button>
              <button className="btn rounded-pill px-5 fw-bold" style={{ background:'linear-gradient(135deg,#064e3b,#059669)', color:'#fff', border:'none' }} disabled={saving} onClick={handleSave}>
                {saving?<><span className="spinner-border spinner-border-sm me-2"/>Saving...</>:'Save Results'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Print Report ───────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const PrintReport = ({ order, ref: r }) => {
  const [clinicData, setClinicData] = React.useState(null);

  React.useEffect(() => {
    const storedClinicId = localStorage.getItem('clinicId') || '';
    const storedClinicName = localStorage.getItem('clinicName') || '';
    clinicService.getAllClinics().then(all => {
      const matched = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;
      setClinicData(matched);
    }).catch(() => {});
  }, []);

  const clinicName = clinicData?.name || localStorage.getItem('clinicName') || 'mediplix';
  const clinicPhone = clinicData?.phone || '9002535240';
  const rawLogoPath = clinicData?.logo || null;
  const clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;

  const grouped = {};
  (order.tests||[]).forEach(t=>{ if(!grouped[t.category]) grouped[t.category]=[]; grouped[t.category].push(t); });
  return (
    <div ref={r} style={{ fontFamily:'Arial,sans-serif', padding:24, maxWidth:800, margin:'0 auto' }}>
      {/* Header: Logo+Phone left, Clinic name+subtitle center */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:20, borderBottom:'2px solid #2563eb', paddingBottom:16, gap:20 }}>
        {/* Left: Logo + Phone */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', minWidth:120 }}>
          {clinicLogo ? (
            <img src={clinicLogo} alt={clinicName}
              onError={e => e.target.style.display='none'}
              style={{ maxHeight:80, maxWidth:180, objectFit:'contain', marginBottom:6 }} />
          ) : (
            <span style={{ fontWeight:900, fontSize:'1.4rem', color:'#1d4ed8', fontStyle:'italic' }}>{clinicName}</span>
          )}
          {clinicPhone && (
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, color:'#1d4ed8', fontWeight:700, fontSize:13 }}>
              <span>📞</span> {clinicPhone}
            </div>
          )}
        </div>
        {/* Center: Title */}
        <div style={{ flex:1, textAlign:'center' }}>
          <h2 style={{ margin:0, color:'#1d4ed8' }}>{clinicName}</h2>
          <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Laboratory Investigation Report</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20, padding:12, backgroundColor:'#f8fafc', borderRadius:8, fontSize:13 }}>
        <div><strong>Patient:</strong> {order.patientName}</div>
        <div><strong>Age/Gender:</strong> {order.patientAge||'—'} yrs / {order.patientGender}</div>
        <div><strong>Phone:</strong> {order.patientPhone||'—'}</div>
        <div><strong>Ref. By:</strong> {order.referredBy||'—'}</div>
        <div><strong>Sample:</strong> {order.sampleType}</div>
        <div><strong>Date:</strong> {fmt(order.orderedDate)}</div>
        <div><strong>Priority:</strong> {order.priority}</div>
        <div><strong>Status:</strong> {order.status}</div>
      </div>
      {Object.entries(grouped).map(([cat,tests])=>(
        <div key={cat} style={{ marginBottom:20 }}>
          <div style={{ backgroundColor:CAT_COLORS[cat]||'#475569', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:12, borderRadius:4, marginBottom:6 }}>{cat}</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ backgroundColor:'#f1f5f9' }}>
              <th style={{ padding:'5px 10px', textAlign:'left', border:'1px solid #e2e8f0' }}>Test Name</th>
              <th style={{ padding:'5px 10px', textAlign:'center', border:'1px solid #e2e8f0', width:100 }}>Result</th>
              <th style={{ padding:'5px 10px', textAlign:'center', border:'1px solid #e2e8f0', width:80 }}>Unit</th>
            </tr></thead>
            <tbody>{tests.map((t,i)=>(
              <tr key={i} style={{ backgroundColor:i%2===0?'#fff':'#fafafa' }}>
                <td style={{ padding:'4px 10px', border:'1px solid #e2e8f0' }}>{t.name}</td>
                <td style={{ padding:'4px 10px', textAlign:'center', border:'1px solid #e2e8f0', fontWeight:700, color:t.value?'#000':'#94a3b8' }}>{t.value||'Pending'}</td>
                <td style={{ padding:'4px 10px', textAlign:'center', border:'1px solid #e2e8f0', color:'#64748b' }}>{t.unit||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <div style={{ marginTop:40, display:'flex', justifyContent:'flex-end' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ borderTop:'1px solid #000', paddingTop:8, minWidth:160 }}>Doctor's Signature</div>
        </div>
      </div>
      <div style={{ marginTop:40, paddingTop:12, borderTop:'1px solid #e2e8f0', textAlign:'center', color:'#94a3b8', fontSize:11 }}>
        Computer-generated report
        <div style={{ marginTop:6, fontSize:10, fontWeight:600, color:'#cbd5e1' }}>Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
      </div>
    </div>
  );
};

/* ─── Lab Billing Modal ───────────────────────────────────────── */
const BILL_STATUS_CFG = {
  'Unbilled': { color: '#64748b', bg: '#f1f5f9', label: 'Unbilled' },
  'Partial':  { color: '#d97706', bg: '#fef3c7', label: 'Partial' },
  'Paid':     { color: '#059669', bg: '#d1fae5', label: 'Paid' },
};

const LabBillingModal = ({ order, onClose, onSaved }) => {
  const fmtRs = v => `₹${parseFloat(v || 0).toFixed(2)}`;

  // ─── Billing items state (one row per test) ──────────────────
  const [items, setItems] = useState(() =>
    (order.tests || []).map(t => ({
      name:       t.name,
      category:   t.category,
      qty:        t.qty || 1,
      unitPrice:  t.unitPrice || 0,
      discount:   t.discount || 0,  // flat Rs amount per line
      tax:        t.tax || 0,       // GST %
      totalPrice: t.totalPrice || 0,
    }))
  );

  const [discountType,  setDiscountType]  = useState('flat');  // 'flat' | 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [billDate,      setBillDate]      = useState(order.billDate ? getLocalDateString(new Date(order.billDate)) : getLocalDateString());
  const [saving,        setSaving]        = useState(false);
  const [activeSection, setActiveSection] = useState('billing'); // 'billing' | 'payment'
  const [payAmt,        setPayAmt]        = useState('');
  const [tieUpOrgs,     setTieUpOrgs]     = useState([]);
  const [tieUpOrg,      setTieUpOrg]      = useState(order.tieUpOrganization || '');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/admin/tie-up-orgs`, cfg())
      .then(res => setTieUpOrgs(res.data))
      .catch(err => console.error(err));
  }, []);
  const [payMode,       setPayMode]       = useState('CASH');
  const [payNote,       setPayNote]       = useState('');
  const [payLoading,    setPayLoading]    = useState(false);

  // ─── Live computation ────────────────────────────────────────
  const computed = useMemo(() => {
    let subtotal = 0, disc = 0, tax = 0;
    items.forEach(it => {
      const line = parseFloat(it.unitPrice || 0) * parseInt(it.qty || 1);
      const d    = parseFloat(it.unitPrice || 0) * parseInt(it.qty || 1) * parseFloat(it.discount || 0) / 100;
      const t    = parseFloat((((line - d) * parseFloat(it.tax || 0)) / 100).toFixed(2));
      subtotal += line;
      disc     += d;
      tax      += t;
    });
    let extraDisc = 0;
    if (discountType === 'percent') extraDisc = parseFloat(((subtotal - disc) * parseFloat(discountValue || 0) / 100).toFixed(2));
    else extraDisc = parseFloat(discountValue || 0);
    disc += extraDisc;
    const final = Math.max(0, subtotal - disc + tax);
    return { subtotal, disc, tax, final, balance: Math.max(0, final - (order.receivedAmount || 0)) };
  }, [items, discountType, discountValue, order.receivedAmount]);

  const setItem = (i, key, val) => setItems(prev => { const n = [...prev]; n[i] = { ...n[i], [key]: val }; return n; });

  const handleSaveBilling = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API}${order._id}/billing`, { items, discountType, discountValue, billDate, tieUpOrganization: tieUpOrg }, cfg());
      onSaved(res.data);
      setActiveSection('payment');
    } catch (e) { alert(e.response?.data?.message || 'Failed to save billing'); }
    finally { setSaving(false); }
  };

  const handleAddPayment = async () => {
    if (!payAmt || parseFloat(payAmt) <= 0) return alert('Enter a valid amount');
    setPayLoading(true);
    try {
      const res = await axios.post(`${API}${order._id}/payments`, { amount: parseFloat(payAmt), paymentMode: payMode, note: payNote }, cfg());
      onSaved(res.data);
      setPayAmt(''); setPayNote('');
    } catch (e) { alert(e.response?.data?.message || 'Failed to record payment'); }
    finally { setPayLoading(false); }
  };

  const billStatusCfg = BILL_STATUS_CFG[order.billStatus || 'Unbilled'];

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.7)', zIndex: 1055 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 960 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-2 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                <Receipt size={22} className="text-white" />
              </div>
              <div>
                <div className="text-white fw-bold" style={{ fontSize: '1rem' }}>Lab Billing — {order.patientName}</div>
                <div className="text-white small opacity-75">{order.patientGender} · {order.patientAge} yrs · {order.patientPhone}</div>
              </div>
              <span className="badge px-3 py-2 ms-2" style={{ backgroundColor: billStatusCfg.bg, color: billStatusCfg.color, borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                {billStatusCfg.label}
              </span>
            </div>
            <button className="btn text-white p-2" style={{ borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}><X size={16} /></button>
          </div>

          {/* Section tabs */}
          <div className="d-flex border-bottom" style={{ backgroundColor: '#f8fafc' }}>
            {[{ id: 'billing', label: '1. Bill Items', icon: <Receipt size={14} /> }, { id: 'payment', label: '2. Collect Payment', icon: <CreditCard size={14} /> }].map(t => (
              <button key={t.id}
                className="btn btn-sm py-3 px-4 border-0 rounded-0 d-flex align-items-center gap-2 fw-semibold"
                style={{ fontSize: '0.82rem', color: activeSection === t.id ? '#1d4ed8' : '#64748b', borderBottom: activeSection === t.id ? '3px solid #1d4ed8' : '3px solid transparent', backgroundColor: 'transparent' }}
                onClick={() => setActiveSection(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="modal-body p-0">

            {/* ── Section 1: Bill Items ── */}
            {activeSection === 'billing' && (
              <div className="d-flex" style={{ minHeight: 420 }}>

                {/* Left: Test Line Items */}
                <div className="flex-grow-1 p-4" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="fw-bold text-dark">Test Charges</div>
                    <div className="text-secondary small">Set price, discount and tax for each test</div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm align-middle" style={{ fontSize: '0.83rem' }}>
                      <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Test Name</th>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', width: 55 }}>Qty</th>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', width: 110 }}>Unit Price (₹)</th>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', width: 100 }}>Discount (%)</th>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', width: 80 }}>Tax (%)</th>
                          <th style={{ fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', width: 110, textAlign: 'right' }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, i) => {
                          const line  = parseFloat(it.unitPrice || 0) * parseInt(it.qty || 1);
                          const disc  = parseFloat(it.unitPrice || 0) * parseInt(it.qty || 1) * parseFloat(it.discount || 0) / 100;
                          const taxPc = parseFloat(it.tax || 0);
                          const taxAmt = parseFloat(((line - disc) * taxPc / 100).toFixed(2));
                          const total  = parseFloat((line - disc + taxAmt).toFixed(2));
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td>
                                <div className="fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>{it.name}</div>
                                <div style={{ fontSize: '0.68rem', color: CAT_COLORS[it.category] || '#64748b', fontWeight: 600 }}>{it.category}</div>
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm shadow-none" min={1}
                                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, width: 50 }}
                                  value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} />
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text bg-white" style={{ fontSize: '0.78rem' }}>₹</span>
                                  <input type="number" className="form-control shadow-none" min={0} step="0.01"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: '0 6px 6px 0' }}
                                    value={it.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input type="number" className="form-control shadow-none" min={0} max={100} step="0.1"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: '6px 0 0 6px' }}
                                    value={it.discount} onChange={e => setItem(i, 'discount', e.target.value)} />
                                  <span className="input-group-text bg-white" style={{ fontSize: '0.78rem' }}>%</span>
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input type="number" className="form-control shadow-none" min={0} max={100} step="0.1"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: '6px 0 0 6px' }}
                                    value={it.tax} onChange={e => setItem(i, 'tax', e.target.value)} />
                                  <span className="input-group-text bg-white" style={{ fontSize: '0.78rem' }}>%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: total > 0 ? '#1d4ed8' : '#94a3b8', fontSize: '0.88rem' }}>
                                ₹{total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Order-level discount */}
                  <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="fw-semibold text-dark mb-2" style={{ fontSize: '0.82rem' }}>Order-Level Discount</div>
                    <div className="d-flex gap-2 align-items-center">
                      <select className="form-select form-select-sm shadow-none" style={{ width: 120, border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={discountType} onChange={e => setDiscountType(e.target.value)}>
                        <option value="flat">Flat (₹)</option>
                        <option value="percent">Percent (%)</option>
                      </select>
                      <div className="input-group input-group-sm" style={{ maxWidth: 160 }}>
                        <span className="input-group-text bg-white" style={{ fontSize: '0.78rem' }}>{discountType === 'flat' ? '₹' : '%'}</span>
                        <input type="number" className="form-control shadow-none" min={0} step="0.01"
                          style={{ border: '1.5px solid #e2e8f0', borderRadius: '0 8px 8px 0' }}
                          placeholder="0"
                          value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                      </div>
                      <div className="text-secondary small">Bill Date:</div>
                      <input type="date" className="form-control form-control-sm shadow-none" style={{ width: 160, border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={billDate} onChange={e => setBillDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Tie-Up Organization */}
                  <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="fw-semibold text-dark mb-2" style={{ fontSize: '0.82rem' }}>Tie-Up Organization</div>
                    <select className="form-select form-select-sm shadow-none" style={{ width: 250, border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                      value={tieUpOrg} onChange={e => setTieUpOrg(e.target.value)}>
                      <option value="">None (Regular Bill)</option>
                      {tieUpOrgs.map(o => (
                        <option key={o._id} value={o.name}>{o.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right: Summary Panel */}
                <div className="border-start p-4 d-flex flex-column" style={{ width: 260, flexShrink: 0, backgroundColor: '#fafafa' }}>
                  <div className="fw-bold text-dark mb-3" style={{ fontSize: '0.88rem' }}>Bill Summary</div>

                  <div className="d-flex justify-content-between mb-2 text-secondary small"><span>Subtotal</span><span>₹{computed.subtotal.toFixed(2)}</span></div>
                  <div className="d-flex justify-content-between mb-2 text-secondary small"><span>Discount</span><span className="text-danger">- ₹{computed.disc.toFixed(2)}</span></div>
                  <div className="d-flex justify-content-between mb-2 text-secondary small"><span>Tax / GST</span><span className="text-success">+ ₹{computed.tax.toFixed(2)}</span></div>
                  <div className="border-top pt-2 d-flex justify-content-between mb-1"><span className="fw-bold text-dark">Total</span><span className="fw-black" style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>₹{computed.final.toFixed(2)}</span></div>
                  <div className="d-flex justify-content-between mb-3 text-secondary small"><span>Received</span><span>₹{(order.receivedAmount || 0).toFixed(2)}</span></div>
                  <div className="d-flex justify-content-between p-2 rounded-2" style={{ backgroundColor: computed.balance > 0 ? '#fef3c7' : '#d1fae5' }}>
                    <span className="fw-semibold" style={{ color: computed.balance > 0 ? '#92400e' : '#065f46', fontSize: '0.88rem' }}>Balance Due</span>
                    <span className="fw-black" style={{ color: computed.balance > 0 ? '#b45309' : '#059669', fontSize: '1rem' }}>₹{computed.balance.toFixed(2)}</span>
                  </div>

                  <button className="btn mt-4 fw-bold rounded-pill w-100" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color: '#fff', border: 'none', fontSize: '0.88rem' }}
                    onClick={handleSaveBilling} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Bill & Proceed'}
                  </button>
                  <button className="btn btn-link text-secondary mt-2 small" onClick={() => setActiveSection('payment')}>
                    Skip to Payment ↓
                  </button>
                </div>
              </div>
            )}

            {/* ── Section 2: Collect Payment ── */}
            {activeSection === 'payment' && (
              <div className="d-flex" style={{ minHeight: 420 }}>

                {/* Left: Add payment */}
                <div className="flex-grow-1 p-4">
                  <div className="fw-bold text-dark mb-3">Record Payment</div>

                  {/* Summary strip */}
                  <div className="d-flex gap-3 mb-4">
                    {[
                      { label: 'Total Bill', val: `₹${(order.finalAmount || computed.final).toFixed(2)}`, color: '#1d4ed8' },
                      { label: 'Received', val: `₹${(order.receivedAmount || 0).toFixed(2)}`, color: '#059669' },
                      { label: 'Balance', val: `₹${(order.balanceAmount || computed.balance).toFixed(2)}`, color: (order.balanceAmount || computed.balance) > 0 ? '#b45309' : '#059669' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex-grow-1 p-3 rounded-3 text-center" style={{ border: `2px solid ${color}20`, backgroundColor: `${color}08` }}>
                        <div className="fw-black" style={{ fontSize: '1.2rem', color }}>{val}</div>
                        <div className="small text-secondary mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Amount (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white">₹</span>
                        <input type="number" className="form-control shadow-none" placeholder="0.00" min={0} step="0.01"
                          style={{ border: '1.5px solid #e2e8f0', borderRadius: '0 8px 8px 0' }}
                          value={payAmt} onChange={e => setPayAmt(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Payment Mode *</label>
                      <select className="form-select shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={payMode} onChange={e => setPayMode(e.target.value)}>
                        <option value="CASH">💵 Cash</option>
                        <option value="UPI">📱 UPI</option>
                        <option value="CARD">💳 Card</option>
                        <option value="NETBANKING">🏦 Net Banking</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Note (optional)</label>
                      <input type="text" className="form-control shadow-none" placeholder="e.g. Advance, Final payment..."
                        style={{ border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={payNote} onChange={e => setPayNote(e.target.value)} />
                    </div>
                    <div className="col-12">
                      <button className="btn fw-bold rounded-pill px-5" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', color: '#fff', border: 'none', fontSize: '0.88rem' }}
                        onClick={handleAddPayment} disabled={payLoading}>
                        {payLoading ? <><span className="spinner-border spinner-border-sm me-2" />Recording...</> : '✓ Record Payment'}
                      </button>
                    </div>
                  </div>

                  {/* Payment history */}
                  {(order.payments || []).length > 0 && (
                    <div className="mt-4">
                      <div className="fw-bold text-dark mb-2" style={{ fontSize: '0.82rem' }}>Payment History</div>
                      <div className="d-flex flex-column gap-2">
                        {(order.payments || []).map((p, i) => (
                          <div key={i} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, backgroundColor: '#d1fae5' }}>
                              <CreditCard size={16} style={{ color: '#059669' }} />
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>₹{p.amount.toFixed(2)} — {p.paymentMode}</div>
                              <div className="text-secondary small">{new Date(p.paidAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{p.note && ` · ${p.note}`}</div>
                            </div>
                            <span className="badge" style={{ backgroundColor: '#d1fae5', color: '#059669', fontWeight: 700 }}>PAID</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Final summary */}
                <div className="border-start p-4 d-flex flex-column" style={{ width: 260, flexShrink: 0, backgroundColor: '#fafafa' }}>
                  <div className="fw-bold text-dark mb-3" style={{ fontSize: '0.88rem' }}>Payment Summary</div>
                  <div className="d-flex justify-content-between mb-2 text-secondary small"><span>Total Bill</span><span>₹{(order.finalAmount || computed.final).toFixed(2)}</span></div>
                  <div className="d-flex justify-content-between mb-2 text-secondary small"><span>Total Received</span><span className="text-success fw-semibold">₹{(order.receivedAmount || 0).toFixed(2)}</span></div>
                  <div className="border-top pt-2 d-flex justify-content-between mb-3">
                    <span className="fw-bold text-dark">Balance</span>
                    <span className="fw-black" style={{ fontSize: '1.05rem', color: (order.balanceAmount || 0) > 0 ? '#b45309' : '#059669' }}>
                      ₹{(order.balanceAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-3 text-center" style={{ backgroundColor: (order.billStatus === 'Paid') ? '#d1fae5' : '#fef3c7' }}>
                    <div className="fw-black" style={{ fontSize: '1.1rem', color: (order.billStatus === 'Paid') ? '#059669' : '#b45309' }}>
                      {order.billStatus === 'Paid' ? '✓ Fully Paid' : order.billStatus === 'Partial' ? 'Partially Paid' : 'Unpaid'}
                    </div>
                  </div>
                  <button className="btn mt-3 fw-bold rounded-pill w-100" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #2563eb', fontSize: '0.88rem' }} onClick={() => printLabBill(order)}>
                    <Printer size={16} className="me-2" /> Print Bill
                  </button>
                  <button className="btn mt-2 fw-bold rounded-pill w-100" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #2563eb', fontSize: '0.88rem' }} onClick={() => emailLabBill(order)}>
                    <Mail size={16} className="me-2" /> Email Bill
                  </button>
                  <button className="btn btn-outline-secondary rounded-pill mt-2 mt-auto" onClick={onClose} style={{ fontSize: '0.88rem' }}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Detail Panel ─────────────────────────────────────────── */
const DetailPanel = ({ order, onClose, onEnterResults, onDelete, onBilling }) => {
  const printRef = useRef();
  const s = STATUS_CFG[order.status] || STATUS_CFG['Registered'];
  const p = PRIORITY_CFG[order.priority] || PRIORITY_CFG['Routine'];
  const grouped = {};
  (order.tests||[]).forEach(t=>{ if(!grouped[t.category]) grouped[t.category]=[]; grouped[t.category].push(t); });
  const done = (order.tests||[]).filter(t=>t.value).length;
  const total = (order.tests||[]).length;

  const handlePrint = () => {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Lab Report</title></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(()=>{ w.print(); w.close(); }, 400);
  };

  const billCfg = BILL_STATUS_CFG[order.billStatus || 'Unbilled'];

  return (
    <div className="d-flex flex-column h-100 bg-white" style={{ borderLeft:'1px solid #e2e8f0' }}>
      <div className="px-4 py-3 d-flex align-items-start justify-content-between flex-shrink-0" style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div>
          <div className="text-white fw-bold" style={{ fontSize:'1rem' }}>{order.patientName}</div>
          <div className="text-white opacity-75 small">{order.patientGender} · {order.patientAge?`${order.patientAge} yrs`:''} · {order.patientPhone||''}</div>
          <div className="text-white opacity-100 small mt-1" style={{ fontSize:'0.75rem' }}>
            ID: #{order.patientId || order.patientPhone || 'N/A'} · Bill No: {order.billNo || order._id?.slice(-6).toUpperCase() || 'N/A'}
          </div>
          <div className="mt-1 d-flex gap-2">
            <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>{order.status}</span>
            <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor:p.bg, color:p.color, fontSize:'0.7rem', fontWeight:700 }}>{order.priority}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          {order.status==='Completed'&& (
            <>
              <button className="btn btn-sm fw-semibold" style={{ backgroundColor:'#fff', color:'#2563eb', borderRadius:8, border:'none', fontSize:'0.78rem' }} onClick={handlePrint}>
                <Printer size={13} className="me-1"/>Print Report
              </button>
              <button className="btn btn-sm fw-semibold" style={{ backgroundColor:'#fff', color:'#2563eb', borderRadius:8, border:'none', fontSize:'0.78rem' }} onClick={() => emailLabReport(order)}>
                <Mail size={13} className="me-1"/>Email Report
              </button>
            </>
          )}
          {order.billStatus && order.billStatus !== 'Unbilled' && (
            <>
              <button className="btn btn-sm fw-semibold" style={{ backgroundColor:'#fff', color:'#2563eb', borderRadius:8, border:'none', fontSize:'0.78rem' }} onClick={() => printLabBill(order)}>
                <Printer size={13} className="me-1"/>Print Bill
              </button>
              <button className="btn btn-sm fw-semibold" style={{ backgroundColor:'#fff', color:'#2563eb', borderRadius:8, border:'none', fontSize:'0.78rem' }} onClick={() => emailLabBill(order)}>
                <Mail size={13} className="me-1"/>Email Bill
              </button>
            </>
          )}
          <button className="btn btn-sm fw-semibold" style={{ backgroundColor: billCfg.bg, color: billCfg.color, borderRadius:8, border:`1px solid ${billCfg.color}40`, fontSize:'0.78rem' }} onClick={()=>onBilling(order)}>
            <Receipt size={13} className="me-1"/>{order.billStatus==='Unbilled'||!order.billStatus?'Add Billing':order.billStatus==='Paid'?'View Bill':'Pay Balance'}
          </button>
          <button className="btn btn-sm text-white fw-bold" style={{ borderRadius:8, border:'1.5px solid rgba(255,255,255,0.6)', backgroundColor:'rgba(255,255,255,0.15)', minWidth:32 }} onClick={onClose}><X size={15}/></button>
        </div>

      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 flex-shrink-0" style={{ backgroundColor:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
        <div className="d-flex justify-content-between mb-1">
          <span className="small fw-semibold text-secondary">Results Progress</span>
          <span className="small fw-bold" style={{ color:'#059669' }}>{done}/{total}</span>
        </div>
        <div className="rounded-pill overflow-hidden" style={{ height:6, backgroundColor:'#e2e8f0' }}>
          <div style={{ height:'100%', width:`${total?Math.round(done/total*100):0}%`, backgroundColor:'#059669', borderRadius:10, transition:'width 0.4s' }}></div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 d-flex flex-wrap gap-3 text-secondary flex-shrink-0" style={{ fontSize:'0.78rem', borderBottom:'1px solid #f1f5f9' }}>
        <span><Calendar size={12} className="me-1"/>{fmt(order.orderedDate)}</span>
        {order.referredBy&&<span>👨‍⚕️ {order.referredBy}</span>}
        <span>🧪 {order.sampleType}</span>
        {order.notes&&<span>📝 {order.notes}</span>}
      </div>

      {/* Tests */}
      <div className="flex-grow-1 overflow-auto p-4">
        {Object.entries(grouped).map(([cat,tests])=>(
          <div key={cat} className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="rounded-2 px-3 py-1 fw-bold text-white" style={{ backgroundColor:CAT_COLORS[cat]||'#475569', fontSize:'0.72rem' }}>{cat}</div>
              <span className="text-secondary small">{tests.filter(t=>t.value).length}/{tests.length}</span>
            </div>
            <table className="table table-sm mb-0" style={{ fontSize:'0.82rem' }}>
              <thead><tr style={{ backgroundColor:'#f8fafc' }}>
                <th className="text-secondary fw-semibold py-2" style={{ fontSize:'0.7rem', textTransform:'uppercase' }}>Test</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:100 }}>Result</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:70 }}>Unit</th>
              </tr></thead>
              <tbody>
                {tests.map((t,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}>
                    <td className="py-2 align-middle text-dark" style={{ fontSize:'0.82rem' }}>{t.name}</td>
                    <td className="py-2 align-middle text-center fw-bold" style={{ color:t.value?(CAT_COLORS[cat]||'#1e293b'):'#94a3b8', fontSize:'0.88rem' }}>
                      {t.value||<span className="text-secondary fst-italic small fw-normal">Pending</span>}
                    </td>
                    <td className="py-2 align-middle text-center text-secondary" style={{ fontSize:'0.75rem' }}>{t.unit||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="d-flex flex-column gap-2 mt-2">
          <button className="btn fw-semibold rounded-pill" style={{ background:'linear-gradient(135deg,#064e3b,#059669)', color:'#fff', border:'none', fontSize:'0.88rem' }}
            onClick={()=>onEnterResults(order)}>
            <Edit3 size={14} className="me-2"/>{done>0?'Update Results':'Enter Results'}
          </button>
          <button className="btn fw-semibold rounded-pill" style={{ background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color:'#fff', border:'none', fontSize:'0.88rem' }}
            onClick={()=>onBilling(order)}>
            <Receipt size={14} className="me-2"/>
            {(!order.billStatus||order.billStatus==='Unbilled') ? 'Create Lab Bill' : order.billStatus==='Paid' ? `Bill: Paid ✓` : `Pay Balance ₹${(order.balanceAmount||0).toFixed(2)}`}
          </button>
          <button className="btn btn-outline-danger btn-sm rounded-pill" onClick={()=>onDelete(order._id)}>
            <Trash2 size={13} className="me-1"/>Delete Order
          </button>
        </div>

      </div>

      <div style={{ display:'none' }}><div ref={printRef}><PrintReport order={order}/></div></div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────── */
export default function LabPage() {
  const [catalog, setCatalog] = useState({});
  useEffect(() => {
    axios.get(API + 'catalog', cfg()).then(res => {
      const catMap = {};
      if(Array.isArray(res.data)) {
        res.data.forEach(c => { catMap[c.categoryName || c.category] = c.tests; });
      }
      setCatalog(catMap);
    }).catch(err => console.error('Error fetching catalog', err));
  }, []);
  const [orders, setOrders]         = useState([]);
  const [pastResults, setPast]      = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('orders');
  const [search, setSearch]         = useState('');
  const [statusFilter, setSF]       = useState('All');
  const [showReg, setShowReg]       = useState(false);
  const [enterFor, setEnterFor]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [billingFor, setBillingFor] = useState(null); // lab order opened in billing modal

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [ords, past] = await Promise.all([
        axios.get(API, cfg()).then(r=>r.data),
        doctorService.getAllLabResults().catch(()=>[])
      ]);
      setOrders(ords);
      setPast(past);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ loadOrders(); },[]);

  // Real-time sync via WebSocket
  useWebSocket({ LAB_ORDER_UPDATED: () => loadOrders() });

  const handleRegister = async (form) => {
    const r = await axios.post(API, form, cfg()).then(d=>d.data);
    setOrders(o=>[r,...o]);
    setShowReg(false);
    setDetail(r);
  };

  const handleSaveResults = async (data) => {
    const r = await axios.put(`${API}${enterFor._id}`, data, cfg()).then(d=>d.data);
    setOrders(o=>o.map(x=>x._id===r._id?r:x));
    if(detail?._id===r._id) setDetail(r);
    setEnterFor(null);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this lab order?')) return;
    await axios.delete(`${API}${id}`, cfg());
    setOrders(o=>o.filter(x=>x._id!==id));
    if(detail?._id===id) setDetail(null);
  };

  const handleBillingSaved = (updatedOrder) => {
    setOrders(o => o.map(x => x._id === updatedOrder._id ? updatedOrder : x));
    if (detail?._id === updatedOrder._id) setDetail(updatedOrder);
    setBillingFor(updatedOrder); // keep modal open, show updated state
  };

  const filtered = useMemo(()=> orders.filter(o=>{
    const q=search.toLowerCase();
    return (!q||o.patientName?.toLowerCase().includes(q)||o.patientPhone?.includes(q))
      && (statusFilter==='All'||o.status===statusFilter);
  }),[orders,search,statusFilter]);

  const stats = {
    total: orders.length,
    pending: orders.filter(o=>o.status!=='Completed').length,
    completed: orders.filter(o=>o.status==='Completed').length,
    today: orders.filter(o=>new Date(o.orderedDate).toDateString()===new Date().toDateString()).length,
    collected: orders.reduce((sum,o)=>sum+(o.receivedAmount||0), 0),
    outstanding: orders.reduce((sum,o)=>sum+(o.balanceAmount||0), 0),
  };


  return (
    <div className="d-flex flex-column" style={{ minHeight:'100vh', backgroundColor:'#f0f4f8' }}>
      <Navbar/>

      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%)', padding:'24px 32px 28px' }}>
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center" style={{ width:52,height:52 }}>
              <Microscope size={26} className="text-white"/>
            </div>
            <div>
              <h4 className="text-white fw-black mb-0" style={{ letterSpacing:'-0.5px' }}>Laboratory</h4>
              <div className="text-white small opacity-75">Register patients · Enter results · Print reports</div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm d-flex align-items-center gap-1 fw-semibold rounded-pill px-3"
              style={{ backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)', fontSize:'0.82rem' }}
              onClick={loadOrders}><RefreshCw size={14}/> Refresh</button>
            <button className="btn fw-bold rounded-pill px-4 d-flex align-items-center gap-2 shadow"
              style={{ backgroundColor:'#fff', color:'#1d4ed8', fontSize:'0.88rem' }}
              onClick={()=>setShowReg(true)}>
              <Plus size={18}/> Register Patient
            </button>
          </div>
        </div>

        <div className="d-flex gap-3 flex-wrap">
          {[['Total Orders',stats.total,'#2563eb'],['Pending',stats.pending,'#d97706'],['Completed',stats.completed,'#059669'],["Today's",stats.today,'#7c3aed']].map(([l,v,c])=>(
            <div key={l} className="text-center p-3 rounded-3 flex-grow-1" style={{ backgroundColor:'rgba(255,255,255,0.92)', minWidth:100 }}>
              <div className="fw-black" style={{ fontSize:'1.7rem', color:c, lineHeight:1 }}>{v}</div>
              <div className="small fw-semibold mt-1" style={{ color:'#64748b' }}>{l}</div>
            </div>
          ))}
          <div className="text-center p-3 rounded-3 flex-grow-1" style={{ backgroundColor:'rgba(255,255,255,0.92)', minWidth:120 }}>
            <div className="fw-black" style={{ fontSize:'1.4rem', color:'#059669', lineHeight:1 }}>&#8377;{stats.collected.toFixed(0)}</div>
            <div className="small fw-semibold mt-1" style={{ color:'#64748b' }}>Collected</div>
          </div>
          <div className="text-center p-3 rounded-3 flex-grow-1" style={{ backgroundColor:'rgba(255,255,255,0.92)', minWidth:120 }}>
            <div className="fw-black" style={{ fontSize:'1.4rem', color: stats.outstanding>0?'#b45309':'#059669', lineHeight:1 }}>&#8377;{stats.outstanding.toFixed(0)}</div>
            <div className="small fw-semibold mt-1" style={{ color:'#64748b' }}>Outstanding</div>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="d-flex border-bottom bg-white px-4" style={{ gap:0 }}>
        {[{id:'orders',label:'Lab Orders'},{id:'past',label:'Past Results (from appointments)'}].map(t=>(
          <button key={t.id} className="btn btn-sm py-3 px-4 border-0 rounded-0 fw-semibold"
            style={{ fontSize:'0.82rem', color:activeTab===t.id?'#2563eb':'#64748b',
              borderBottom:activeTab===t.id?'3px solid #2563eb':'3px solid transparent', backgroundColor:'transparent' }}
            onClick={()=>setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight:0 }}>
        <div className="d-flex flex-column overflow-hidden" style={{ flex:detail?'0 0 55%':'1 1 100%', minWidth:0, transition:'flex 0.3s' }}>
          {/* Filter bar */}
          <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white flex-wrap" style={{ borderBottom:'1px solid #e2e8f0' }}>
            <div className="position-relative" style={{ flex:1, maxWidth:320 }}>
              <Search size={14} className="position-absolute text-secondary" style={{ top:'50%', left:12, transform:'translateY(-50%)' }}/>
              <input className="form-control shadow-none" style={{ paddingLeft:'2.1rem', borderRadius:24, border:'1.5px solid #e2e8f0', fontSize:'0.85rem' }}
              placeholder="Search by name or phone..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {activeTab==='orders'&&(
              <div className="d-flex gap-1 flex-wrap">
                {['All','Registered','Sample Collected','Processing','Completed'].map(s=>(
                  <button key={s} className="btn btn-sm rounded-pill px-3"
                    style={{ fontSize:'0.75rem', fontWeight:600, backgroundColor:statusFilter===s?'#2563eb':'transparent',
                      color:statusFilter===s?'#fff':'#64748b', border:statusFilter===s?'1.5px solid #2563eb':'1.5px solid #e2e8f0' }}
                    onClick={()=>setSF(s)}>{s}</button>
                ))}
              </div>
            )}
            <span className="text-secondary small ms-auto">{activeTab==='orders'?filtered.length:pastResults.length} records</span>
          </div>

          <div className="flex-grow-1 overflow-auto" style={{ padding: detail ? '12px 16px' : '16px 24px' }}>
            {loading?<div className="d-flex justify-content-center py-5"><Loader size={28} style={{ color:'#2563eb', animation:'spin 1s linear infinite' }}/></div>
            : activeTab==='orders' ? (
              filtered.length===0?(
                <div className="text-center py-5">
                  <div style={{ fontSize:'3rem' }} className="mb-3">🔬</div>
                  <h6 className="fw-bold text-dark">No Lab Orders Yet</h6>
                  <p className="text-secondary small mb-3">Register a patient for lab tests using the button above.</p>
                  <button className="btn btn-primary rounded-pill px-4" onClick={()=>setShowReg(true)}><Plus size={16} className="me-1"/>Register First Patient</button>
                </div>
              ):(
                /* ─── Table-style list like reference screenshot ─── */
                <div className="bg-white rounded-3 shadow-sm overflow-hidden" style={{ border:'1px solid #e2e8f0' }}>
                  <table className="table table-hover align-middle mb-0" style={{ fontSize:'0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase', paddingLeft:20, width:110 }}>Patient ID</th>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase' }}>Patient Name</th>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:180 }}>Bill / Amount</th>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:140 }}>Lab Tests</th>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:120 }}>Status</th>
                        <th className="text-secondary fw-semibold py-3" style={{ fontSize:'0.7rem', textTransform:'uppercase', width:160, paddingRight:16 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(o=>{
                        const s=STATUS_CFG[o.status]||STATUS_CFG['Registered'];
                        const total=(o.tests||[]).length;
                        const sel=detail?._id===o._id;
                        const billStatus = o.billStatus || 'Unbilled';
                        const finalAmt = parseFloat(o.finalAmount || 0);
                        const receivedAmt = parseFloat(o.receivedAmount || 0);
                        const balanceAmt = parseFloat(o.balanceAmount || Math.max(0, finalAmt - receivedAmt));

                        // Payment color logic
                        const isPaid = billStatus === 'Paid' || (finalAmt > 0 && balanceAmt <= 0);
                        const isPartial = billStatus === 'Partial' || (receivedAmt > 0 && balanceAmt > 0);
                        const isUnpaid = !isPaid && !isPartial;

                        const handlePrintRow = async (e) => {
                          e.stopPropagation();
                          const done = (o.tests||[]).filter(t=>t.value).length;
                          if (done === 0) { alert('No results entered yet for this order.'); return; }
                          
                          // Open window synchronously to bypass popup blockers
                          const w = window.open('','_blank'); 
                          w.document.write('<html><body><div style="font-family:sans-serif;padding:24px;">Preparing report...</div></body></html>');

                          try {
                            // Fetch clinic data for logo and phone
                            const storedClinicId = localStorage.getItem('clinicId') || '';
                            const storedClinicName = localStorage.getItem('clinicName') || '';
                            const all = await clinicService.getAllClinics().catch(() => []);
                            const clinicData = all.find(c => c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()) || all[0] || null;

                            const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                            const clinicName = clinicData?.name || storedClinicName || 'mediplix';
                            const clinicPhone = clinicData?.phone || '9002535240';
                            const rawLogoPath = clinicData?.logo || null;
                            const clinicLogo = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;

                            const grouped2 = {};
                            (o.tests||[]).forEach(t=>{ if(!grouped2[t.category]) grouped2[t.category]=[]; grouped2[t.category].push(t); });
                            const rows = Object.entries(grouped2).map(([cat,tests])=>
                              `<tr><td colspan="3" class="cat-row">${cat}</td></tr>`+
                              tests.map(t=>`<tr><td>${t.name}</td><td style="text-align:center;font-weight:700;">${t.value||'Pending'}</td><td style="text-align:center;color:#64748b;">${t.unit||'—'}</td></tr>`).join('')
                            ).join('');

                            const html=`<!DOCTYPE html><html><head><title>Lab Report - ${o.patientName}</title>
                            <style>
                              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px 50px; color: #111; }
                              @media print { body { padding: 15px 25px; } }
                              .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                              .header-left { text-align: left; display: flex; flex-direction: column; align-items: flex-start; }
                              .header-right { text-align: right; }
                              .logo { max-height: 90px; max-width: 240px; object-fit: contain; margin-bottom: 12px; }
                              .phone-box { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; font-weight: 800; color: #000; }
                              .clinic-title { font-size: 2.2rem; font-weight: 900; color: #1d4ed8; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
                              .clinic-sub { font-size: 1.1rem; color: #64748b; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
                              
                              .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; padding: 20px 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 14px; }
                              .patient-grid div { display: flex; flex-direction: column; }
                              .patient-grid strong { color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
                              .patient-grid span { font-weight: 700; color: #0f172a; font-size: 15px; }

                              table { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
                              th { background: #1e293b; color: #fff; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                              td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; }
                              .cat-row { background: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #cbd5e1; padding-top: 16px; padding-bottom: 16px;}
                              
                              .footer { margin-top: 80px; display: flex; justify-content: flex-end; }
                              .signature { text-align: center; border-top: 2px solid #000; padding-top: 10px; min-width: 220px; font-weight: 700; font-size: 15px; }
                            </style>
                            </head><body>
                              <div class="header">
                                <div class="header-left">
                                  ${clinicLogo ? `<img class="logo" src="${clinicLogo}" />` : `<div style="font-size:2rem;font-weight:900;color:#1d4ed8;font-style:italic;margin-bottom:12px;">${clinicName}</div>`}
                                  <div class="phone-box">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    ${clinicPhone}
                                  </div>
                                </div>
                                <div class="header-right">
                                  <h2 class="clinic-title">${clinicName}</h2>
                                  <div class="clinic-sub">Laboratory Investigation Report</div>
                                </div>
                              </div>
                              <div class="patient-grid">
                                <div><strong>Patient</strong> <span>${o.patientName}</span></div>
                                <div><strong>ID / UHID</strong> <span>${o.uhid||o.patientId||'—'}</span></div>
                                <div><strong>Age / Gender</strong> <span>${o.patientAge||'—'} yrs / ${o.patientGender}</span></div>
                                <div><strong>Phone</strong> <span>${o.patientPhone||'—'}</span></div>
                                <div><strong>Referred By</strong> <span>${o.referredBy||'—'}</span></div>
                                <div><strong>Date</strong> <span>${new Date(o.orderedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
                                <div><strong>Sample</strong> <span>${o.sampleType}</span></div>
                                <div><strong>Priority</strong> <span>${o.priority}</span></div>
                              </div>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Test Name</th>
                                    <th style="text-align:center">Result</th>
                                    <th style="text-align:center">Unit</th>
                                  </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                              </table>
                              <div class="footer">
                                <div class="signature">Doctor's Signature</div>
                              </div>
                              <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
                                Computer-generated report
                                <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
                              </div>
                            </body></html>`;

                            w.document.open();
                            w.document.write(html);
                            w.document.close();
                            w.focus();
                            setTimeout(()=>{w.print();},400);
                          } catch (err) {
                            console.error("Error generating print:", err);
                            w.close();
                          }
                        };

                        const handleEmailRow = async (e) => {
                          e.stopPropagation();
                          await emailLabReport(o);
                        };

                        return (
                          <tr key={o._id}
                            style={{ borderBottom:'1px solid #f1f5f9', backgroundColor: sel?'#eff6ff':'white', cursor:'pointer', transition:'background 0.15s' }}
                            onMouseEnter={e=>{ if(!sel) e.currentTarget.style.backgroundColor='#f8fafc'; }}
                            onMouseLeave={e=>{ if(!sel) e.currentTarget.style.backgroundColor='white'; }}
                            onClick={()=>setDetail(sel?null:o)}>

                            {/* Patient ID */}
                            <td style={{ paddingLeft:20, color:'#64748b', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:600 }}>
                              {o.uhid || o.patientId || o._id?.slice(-6).toUpperCase()}
                            </td>

                            {/* Patient Name */}
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                  style={{ width:32, height:32, backgroundColor: s.color, fontSize:'0.78rem' }}>
                                  {o.patientName?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize:'0.88rem' }}>{o.patientName}</div>
                                  <div className="text-secondary" style={{ fontSize:'0.72rem' }}>
                                    {o.patientGender} · {o.patientAge ? `${o.patientAge} yrs` : '—'}
                                    {o.patientPhone ? ` · ${o.patientPhone}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Print icon and Amount */}
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <button
                                  className="btn btn-sm p-1"
                                  style={{ color:'#2563eb', backgroundColor:'transparent', border:'none', flexShrink:0 }}
                                  title="Print Lab Report"
                                  onClick={handlePrintRow}>
                                  <Printer size={16}/>
                                </button>
                                <button
                                  className="btn btn-sm p-1"
                                  style={{ color:'#2563eb', backgroundColor:'transparent', border:'none', flexShrink:0 }}
                                  title="Email Lab Report"
                                  onClick={handleEmailRow}>
                                  <Mail size={16}/>
                                </button>
                                
                                <div 
                                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} 
                                  onClick={e => { e.stopPropagation(); setBillingFor(o); }}
                                  title={!o.billStatus ? "Create Bill" : isPaid ? "View Bill" : "Make Payment"}
                                >
                                  {finalAmt <= 0 && !o.billStatus ? (
                                    <span className="text-secondary" style={{ fontSize:'0.82rem', fontStyle:'italic' }}>No bill</span>
                                  ) : isPaid ? (
                                    <span className="fw-bold" style={{ color:'#059669', fontSize:'0.92rem' }}>
                                      ₹{finalAmt.toFixed(0)}
                                    </span>
                                  ) : isPartial ? (
                                    <span className="d-inline-flex align-items-center gap-1" style={{ fontSize:'0.82rem' }}>
                                      <span className="fw-bold" style={{ color:'#059669' }}>₹{receivedAmt.toFixed(0)}</span>
                                      <span className="text-secondary">+</span>
                                      <span className="fw-bold" style={{ color:'#dc2626' }}>₹{balanceAmt.toFixed(0)}</span>
                                    </span>
                                  ) : (
                                    <span className="fw-bold" style={{ color: finalAmt > 0 ? '#dc2626' : '#94a3b8', fontSize:'0.92rem' }}>
                                      ₹{finalAmt.toFixed(0)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Lab Tests count */}
                            <td>
                              <button
                                className="btn btn-sm fw-semibold px-0"
                                style={{ color:'#2563eb', background:'none', border:'none', fontSize:'0.82rem', textDecoration:'underline' }}
                                onClick={e=>{e.stopPropagation();setDetail(sel?null:o);}}>
                                {total} Lab Test{total!==1?'s':''}
                              </button>
                            </td>

                            {/* Status badge */}
                            <td>
                              <span className="badge rounded-pill px-2 py-1" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>
                                {o.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ paddingRight:16 }}>
                              <div className="d-flex gap-1">
                                <button className="btn btn-sm fw-semibold rounded-pill"
                                  style={{ background:'linear-gradient(135deg,#064e3b,#059669)', color:'#fff', border:'none', fontSize:'0.72rem', padding:'3px 10px', whiteSpace:'nowrap' }}
                                  onClick={e=>{e.stopPropagation();setEnterFor(o);}}>
                                  Results
                                </button>
                                <button className="btn btn-sm fw-semibold rounded-pill"
                                  style={{
                                    backgroundColor: isPaid?'#d1fae5': isPartial?'#fef3c7':'#fee2e2',
                                    color: isPaid?'#059669': isPartial?'#b45309':'#dc2626',
                                    border:`1px solid ${isPaid?'#059669': isPartial?'#d97706':'#dc2626'}30`,
                                    fontSize:'0.72rem', padding:'3px 10px', whiteSpace:'nowrap'
                                  }}
                                  onClick={e=>{e.stopPropagation();setBillingFor(o);}}>
                                  <Receipt size={11} className="me-1"/>
                                  {isPaid ? 'Paid ✓' : isPartial ? 'Pay Due' : 'Bill'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="d-flex justify-content-between px-4 py-2" style={{ backgroundColor:'#f8fafc', borderTop:'1px solid #e2e8f0', fontSize:'0.75rem', color:'#94a3b8' }}>
                    <span>{filtered.length} order(s) shown</span>
                    <span className="d-flex align-items-center gap-3">
                      <span className="d-flex align-items-center gap-1"><span style={{ width:10, height:10, borderRadius:'50%', backgroundColor:'#059669', display:'inline-block' }}/> Paid</span>
                      <span className="d-flex align-items-center gap-1"><span style={{ width:10, height:10, borderRadius:'50%', backgroundColor:'#dc2626', display:'inline-block' }}/> Unpaid</span>
                      <span className="d-flex align-items-center gap-1"><span style={{ width:10, height:10, borderRadius:'50%', backgroundColor:'#d97706', display:'inline-block' }}/> Partial</span>
                    </span>
                  </div>
                </div>
              )
            ):(
              // Past results tab
              pastResults.length===0?(
                <div className="text-center py-5">
                  <div style={{ fontSize:'3rem' }} className="mb-3">📋</div>
                  <h6 className="fw-bold">No past results found</h6>
                  <p className="text-secondary small">Results entered from Doctor visits or Front Desk will appear here.</p>
                </div>
              ):(
                <div className={detail?'d-flex flex-column gap-3':'row g-3'}>
                  {pastResults.filter(r=>{const q=search.toLowerCase();return !q||r.patient?.name?.toLowerCase().includes(q)||r.patient?.phone?.includes(q);}).map(rec=>{
                    const grouped={};
                    (rec.tests||[]).forEach(t=>{const c=t.category||'Additional Tests';grouped[c]=(grouped[c]||0)+1;});
                    const sel=detail?._id===rec._id;
                    return (
                      <div key={rec._id} className={detail?'':'col-xl-4 col-lg-6 col-md-6'}>
                        <div className="card border-0 shadow-sm h-100" style={{ borderRadius:14, cursor:'pointer', outline:sel?'2px solid #2563eb':'none' }}
                          onMouseEnter={e=>!sel&&(e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)')}
                          onMouseLeave={e=>!sel&&(e.currentTarget.style.boxShadow='')}
                          onClick={()=>setDetail({...rec,_fromAppointment:true})}>
                          <div style={{ height:4, background:'linear-gradient(90deg,#1d4ed8,#3b82f6)', borderRadius:'14px 14px 0 0' }}></div>
                          <div className="p-3">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width:36,height:36, backgroundColor:'#2563eb', fontSize:'0.85rem' }}>{rec.patient?.name?.charAt(0)?.toUpperCase()||'?'}</div>
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize:'0.9rem' }}>{rec.patient?.name||'Unknown'}</div>
                                <div className="text-secondary" style={{ fontSize:'0.75rem' }}>{rec.patient?.gender}·{rec.patient?.age}yrs</div>
                              </div>
                              <span className="ms-auto badge px-2" style={{ backgroundColor:'#d1fae5', color:'#059669', fontSize:'0.7rem', fontWeight:700 }}>Completed</span>
                            </div>
                            <div className="d-flex align-items-center gap-1 mb-2 text-secondary" style={{ fontSize:'0.75rem' }}><Calendar size={11}/>{fmt(rec.updatedAt)}</div>
                            <div className="d-flex flex-wrap gap-1">
                              {Object.entries(grouped).map(([cat,cnt])=>(
                                <span key={cat} className="badge rounded-pill px-2" style={{ backgroundColor:(CAT_COLORS[cat]||'#475569')+'18', color:CAT_COLORS[cat]||'#475569', fontSize:'0.68rem' }}>
                                  {cat.split(' ')[0]} ({cnt})
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Detail */}
        {detail && !detail._fromAppointment && (
          <div style={{ flex:'0 0 45%', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <DetailPanel order={detail} onClose={()=>setDetail(null)}
              onEnterResults={o=>{setEnterFor(o);}}
              onBilling={o=>setBillingFor(o)}
              onDelete={handleDelete}/>
          </div>
        )}
      </div>

      {showReg && <RegisterModal catalog={catalog} onSave={handleRegister} onClose={()=>setShowReg(false)}/>}
      {enterFor && <EnterResultsModal order={enterFor} onSave={handleSaveResults} onClose={()=>setEnterFor(null)}/>}
      {billingFor && <LabBillingModal order={billingFor} onClose={()=>setBillingFor(null)} onSaved={handleBillingSaved}/>}


      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fw-black{font-weight:900!important}
      `}</style>
    </div>
  );
}
