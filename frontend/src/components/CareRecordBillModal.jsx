import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Printer, Info, PlusCircle, Trash2, Receipt,
  CheckCircle, AlertCircle, CreditCard, Banknote, Smartphone,
  User, Calendar, FileText, ChevronDown, ChevronUp, Mail
} from 'lucide-react';
import clinicService from '../services/clinicService';
import { sendDocumentAsEmail } from '../services/emailService';

/* ─── Shared Bill Modal for DayCare & HomeCare ──────────────────── */
const CareRecordBillModal = ({
  record, sourceType, service, onClose,
  accentColor = '#b45309',
  accentBg    = 'linear-gradient(135deg,#92400e,#d97706)'
}) => {

  const [bills, setBills]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('addBill');
  const [saving, setSaving]             = useState(false);

  // Per-bill payment state keyed by bill._id
  const [payState, setPayState]         = useState({});

  // Add-bill form
  const [billDate, setBillDate]         = useState(new Date().toISOString().split('T')[0]);
  const [depositAmount, setDeposit]     = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [items, setItems]               = useState([newItem()]);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.name || 'Staff'; } catch { return 'Staff'; }
  })();

  function newItem() {
    return { serviceName: '', qty: 1, unitPrice: '', gstPercent: 0, discount: 0 };
  }

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await service.getBills(record._id);
      setBills(data || []);
    } catch (e) {
      console.error('Failed to load bills', e);
    } finally {
      setLoading(false);
    }
  }, [record._id, service]);

  useEffect(() => { loadBills(); }, [loadBills]);

  /* ── Computed Totals ─────────────────────────────────────────── */
  const computedTotals = (() => {
    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;
    items.forEach(item => {
      const up   = parseFloat(item.unitPrice) || 0;
      const q    = parseInt(item.qty) || 1;
      const gst  = parseFloat(item.gstPercent) || 0;
      const disc = parseFloat(item.discount) || 0;
      const lineTotal = up * q;
      const taxAmt = ((lineTotal - disc) * gst) / 100;
      totalBilledAmount += lineTotal;
      totalDiscount     += disc;
      totalTax          += taxAmt;
    });
    let extraDiscount = 0;
    if (discountType === 'percent') extraDiscount = (totalBilledAmount - totalDiscount) * (parseFloat(discountValue) || 0) / 100;
    else if (discountType === 'flat') extraDiscount = parseFloat(discountValue) || 0;
    totalDiscount += extraDiscount;
    const finalAmount  = Math.max(0, totalBilledAmount - totalDiscount + totalTax);
    const dep          = parseFloat(depositAmount) || 0;
    const totalBalance = Math.max(0, finalAmount - dep);
    return { totalBilledAmount, totalDiscount, totalTax, finalAmount, totalBalance };
  })();

  /* ── Item CRUD ──────────────────────────────────────────────── */
  const addItem    = ()        => setItems(p => [...p, newItem()]);
  const removeItem = (i)       => setItems(p => p.filter((_, idx) => idx !== i));
  const editItem   = (i, k, v) => setItems(p => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });

  /* ── Save Bill ──────────────────────────────────────────────── */
  const handleSaveBill = async () => {
    if (!items.some(it => it.serviceName?.trim())) { alert('Add at least one service item.'); return; }
    setSaving(true);
    try {
      const payload = {
        [sourceType === 'DayCare' ? 'dayCareId' : 'homeCareId']: record._id,
        patientName: record.patientName,
        items: items.map(it => ({
          serviceName: it.serviceName,
          qty: parseInt(it.qty) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          gstPercent: parseFloat(it.gstPercent) || 0,
          discount: parseFloat(it.discount) || 0,
        })),
        billDate,
        depositAmount: parseFloat(depositAmount) || 0,
        discountType: discountType === 'none' ? undefined : discountType,
        discountValue: discountType !== 'none' ? parseFloat(discountValue) || 0 : undefined,
      };
      await service.createBill(payload);
      await loadBills();
      setItems([newItem()]);
      setDeposit('');
      setDiscountType('none');
      setDiscountValue('');
      setActiveTab('bills');
    } catch (e) {
      alert('Error saving bill: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Per-bill payment helpers ─────────────────────────────── */
  const getBillPay   = (id) => payState[id] || { amount: '', mode: 'CASH', details: '', paying: false, open: false };
  const setPayField  = (id, key, val) => setPayState(ps => ({ ...ps, [id]: { ...getBillPay(id), ...ps[id], [key]: val } }));
  const togglePayOpen = (id) => setPayState(ps => ({ ...ps, [id]: { ...getBillPay(id), ...ps[id], open: !(ps[id]?.open) } }));

  const handlePay = async (bill) => {
    const ps  = getBillPay(bill._id);
    const amt = parseFloat(ps.amount);
    if (!amt || amt <= 0)            { alert('Enter a valid payment amount.'); return; }
    if (amt > bill.totalBalance + 0.01) { alert(`Amount ₹${amt} exceeds balance ₹${bill.totalBalance.toFixed(2)}`); return; }
    setPayField(bill._id, 'paying', true);
    try {
      await service.payBill(bill._id, { amount: amt, paymentMode: ps.mode, purpose: ps.details });
      await loadBills();
      setPayState(ps2 => ({ ...ps2, [bill._id]: { amount: '', mode: 'CASH', details: '', paying: false, open: false } }));
    } catch (e) {
      alert('Payment error: ' + (e.response?.data?.message || e.message));
      setPayField(bill._id, 'paying', false);
    }
  };

  /* ── Print ──────────────────────────────────────────────────── */
  const doPrint = async (billsToPrint) => {
    if (!billsToPrint || billsToPrint.length === 0) { alert('No bills to print.'); return; }

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

    const makeRows = (bill, bi) => {
      const itemRows = (bill.items || []).map((it, i) => `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${i+1}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${it.serviceName}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.qty}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right">&#8377;${(+it.unitPrice||0).toFixed(2)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.gstPercent||0}%</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-&#8377;${(+it.discount||0).toFixed(2)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${accentColor}">&#8377;${(+it.totalPrice||0).toFixed(2)}</td>
        </tr>`).join('');

      const payRows = (bill.payments || []).map(p => `
        <tr>
          <td style="padding:5px 12px;font-size:12px">${new Date(p.paidAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
          <td style="padding:5px 12px;font-size:12px">${p.paymentMode}</td>
          <td style="padding:5px 12px;font-size:12px">${p.purpose||'—'}</td>
          <td style="padding:5px 12px;font-size:12px;font-weight:700;color:#059669">&#8377;${(+p.amount).toFixed(2)}</td>
        </tr>`).join('');

      const isPaid = bill.totalBalance <= 0;
      return `
      <div style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(135deg,#f8fafc,#f1f5f9)">
          <div>
            <span style="font-weight:700;font-size:1rem">Bill #${bi+1}</span>
            <span style="margin-left:10px;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${isPaid?'#d1fae5':'#fef3c7'};color:${isPaid?'#059669':'#d97706'}">${isPaid?'&#10003; Paid':'Balance Due'}</span>
            <div style="color:#64748b;font-size:0.78rem;margin-top:3px">${new Date(bill.billDate||bill.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:1.1rem;color:${accentColor}">&#8377; ${(+bill.finalAmount||0).toFixed(2)}</div>
            <div style="color:#64748b;font-size:0.78rem">Paid: &#8377; ${(+bill.receivedAmount||0).toFixed(2)}</div>
          </div>
        </div>
        ${bill.billedBy?`<div style="padding:6px 16px;font-size:0.78rem;color:#64748b;background:${accentColor}0a;border-bottom:1px solid #f1f5f9">Billed by: <b style="color:${accentColor}">${bill.billedBy}</b></div>`:''}
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#64748b">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#64748b">Service</th>
            <th style="padding:8px 12px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#64748b">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Unit Price</th>
            <th style="padding:8px 12px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#64748b">GST</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Discount</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="padding:10px 16px;display:flex;justify-content:flex-end;gap:20px;border-top:1px solid #f1f5f9;font-size:0.8rem">
          ${[['Total',bill.totalBilledAmount],['Discount',bill.totalDiscount],['Tax',bill.totalTax],['Final',bill.finalAmount],['Balance',bill.totalBalance]]
            .map(([l,v])=>`<div style="text-align:center"><div style="color:#64748b;font-size:0.68rem;text-transform:uppercase">${l}</div><div style="font-weight:700">&#8377; ${(+v||0).toFixed(2)}</div></div>`).join('')}
        </div>
        ${(bill.payments?.length>0)?`
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;background:#fafaf9">
          <div style="font-weight:700;font-size:0.72rem;text-transform:uppercase;color:#64748b;margin-bottom:6px">Payment History</div>
          <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Date</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Mode</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Remarks</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Amount</th>
            </tr></thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>`:''}
        <div style="padding:8px 16px;background:${isPaid?'#d1fae5':'#fef3c7'};color:${isPaid?'#059669':'#d97706'};font-weight:700;font-size:0.82rem">
          ${isPaid?'&#10003; Fully Paid — All payments received.':'&#9888; Balance Due: &#8377; '+(+bill.totalBalance||0).toFixed(2)}
        </div>
      </div>`;
    };

    const tGrand = billsToPrint.reduce((s,b)=>s+(+b.finalAmount||0),0);
    const tPaid  = billsToPrint.reduce((s,b)=>s+(+b.receivedAmount||0),0);
    const tDue   = billsToPrint.reduce((s,b)=>s+(+b.totalBalance||0),0);

    const html = `<!DOCTYPE html><html><head><title>Invoice &#8212; ${record.patientName}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI', Arial, sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}@media print{body{padding:16px}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid ${accentColor}">
  <div style="display:flex;flex-direction:column;align-items:flex-start">
    ${clinicLogo ? `<img src="${clinicLogo}" style="max-height:80px;max-width:240px;object-fit:contain;margin-bottom:10px" />` : `<h2 style="margin:0;color:${accentColor};font-size:24px;font-weight:900;margin-bottom:10px">${clinicName}</h2>`}
    <div style="display:flex;align-items:center;gap:6px;font-size:1.15rem;font-weight:800;color:#000">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      ${clinicPhone}
    </div>
    <p style="margin:6px 0 0;color:#64748b;font-size:13px;font-weight:600">Medical Invoice &#8212; ${sourceType==='DayCare'?'Day Care':'Home Care'} Billing</p>
  </div>
  <div style="text-align:right">
    <div style="font-size:22px;font-weight:900;color:${accentColor};letter-spacing:2px">INVOICE</div>
    <div style="color:#64748b;font-size:12px;margin-top:4px;font-weight:600">Printed: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
  <div style="background:#f8fafc;padding:14px;border-radius:8px">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Bill To</div>
    <div style="font-weight:700;font-size:15px">${record.patientName||'—'}</div>
    <div style="color:#64748b;margin-top:3px">${record.patientGender||''} &#183; ${record.patientAge||''} yrs</div>
    ${record.uhid?`<div style="color:#64748b">UHID: ${record.uhid}</div>`:''}
  </div>
  <div style="background:#f8fafc;padding:14px;border-radius:8px">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Grand Summary</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total Bills</span><span>${billsToPrint.length}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Grand Total</span><span style="font-weight:700">&#8377; ${tGrand.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#059669"><span>Total Paid</span><span style="font-weight:700">&#8377; ${tPaid.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid #e2e8f0;font-weight:700;font-size:14px">
      <span style="color:${tDue>0?'#dc2626':'#059669'}">Balance Due</span>
      <span style="color:${tDue>0?'#dc2626':'#059669'}">&#8377; ${tDue.toFixed(2)}</span>
    </div>
  </div>
</div>
${billsToPrint.map((b,i)=>makeRows(b,i)).join('')}
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
  Thank you for choosing ${localStorage.getItem('clinicName') || 'us'} &#183; Computer-generated invoice
  <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=920,height=720');
    if (!win) { alert('Pop-ups are blocked. Allow pop-ups for this site to print.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const doEmail = async (billsToPrint) => {
    if (!billsToPrint || billsToPrint.length === 0) { alert('No bills to email.'); return; }
    
    let targetEmail = record.patientEmail;
    if (!targetEmail) {
      targetEmail = window.prompt("Patient does not have a registered email address. Please enter an email address to send the bill:");
      if (!targetEmail) return;
      try {
        if (service.update) {
          await service.update(record._id, { patientEmail: targetEmail });
        }
      } catch(err) { console.error("Could not save email", err); }
    } else {
      const newEmail = window.prompt("Confirm or change the email address to send the bill:", targetEmail);
      if (!newEmail) return;
      if (newEmail !== targetEmail) {
        targetEmail = newEmail;
        try {
          if (service.update) {
            await service.update(record._id, { patientEmail: targetEmail });
          }
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

    const makeRows = (bill, bi) => {
      const itemRows = (bill.items || []).map((it, i) => `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${i+1}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${it.serviceName}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.qty}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right">&#8377;${(+it.unitPrice||0).toFixed(2)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.gstPercent||0}%</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">-&#8377;${(+it.discount||0).toFixed(2)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${accentColor}">&#8377;${(+it.totalPrice||0).toFixed(2)}</td>
        </tr>`).join('');

      const payRows = (bill.payments || []).map(p => `
        <tr>
          <td style="padding:5px 12px;font-size:12px">${new Date(p.paidAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
          <td style="padding:5px 12px;font-size:12px">${p.paymentMode}</td>
          <td style="padding:5px 12px;font-size:12px">${p.purpose||'—'}</td>
          <td style="padding:5px 12px;font-size:12px;font-weight:700;color:#059669">&#8377;${(+p.amount).toFixed(2)}</td>
        </tr>`).join('');

      const isPaid = bill.totalBalance <= 0;
      return `
      <div style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(135deg,#f8fafc,#f1f5f9)">
          <div>
            <span style="font-weight:700;font-size:1rem">Bill #${bi+1}</span>
            <span style="margin-left:10px;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${isPaid?'#d1fae5':'#fef3c7'};color:${isPaid?'#059669':'#d97706'}">${isPaid?'&#10003; Paid':'Balance Due'}</span>
            <div style="color:#64748b;font-size:0.78rem;margin-top:3px">${new Date(bill.billDate||bill.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:1.1rem;color:${accentColor}">&#8377; ${(+bill.finalAmount||0).toFixed(2)}</div>
            <div style="color:#64748b;font-size:0.78rem">Paid: &#8377; ${(+bill.receivedAmount||0).toFixed(2)}</div>
          </div>
        </div>
        ${bill.billedBy?`<div style="padding:6px 16px;font-size:0.78rem;color:#64748b;background:${accentColor}0a;border-bottom:1px solid #f1f5f9">Billed by: <b style="color:${accentColor}">${bill.billedBy}</b></div>`:''}
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#64748b">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#64748b">Service</th>
            <th style="padding:8px 12px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#64748b">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Unit Price</th>
            <th style="padding:8px 12px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#64748b">GST</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Discount</th>
            <th style="padding:8px 12px;text-align:right;font-size:0.68rem;text-transform:uppercase;color:#64748b">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="padding:10px 16px;display:flex;justify-content:flex-end;gap:20px;border-top:1px solid #f1f5f9;font-size:0.8rem">
          ${[['Total',bill.totalBilledAmount],['Discount',bill.totalDiscount],['Tax',bill.totalTax],['Final',bill.finalAmount],['Balance',bill.totalBalance]]
            .map(([l,v])=>`<div style="text-align:center"><div style="color:#64748b;font-size:0.68rem;text-transform:uppercase">${l}</div><div style="font-weight:700">&#8377; ${(+v||0).toFixed(2)}</div></div>`).join('')}
        </div>
        ${(bill.payments?.length>0)?`
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;background:#fafaf9">
          <div style="font-weight:700;font-size:0.72rem;text-transform:uppercase;color:#64748b;margin-bottom:6px">Payment History</div>
          <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Date</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Mode</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Remarks</th>
              <th style="padding:5px 12px;text-align:left;color:#64748b;font-size:0.68rem">Amount</th>
            </tr></thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>`:''}
        <div style="padding:8px 16px;background:${isPaid?'#d1fae5':'#fef3c7'};color:${isPaid?'#059669':'#d97706'};font-weight:700;font-size:0.82rem">
          ${isPaid?'&#10003; Fully Paid — All payments received.':'&#9888; Balance Due: &#8377; '+(+bill.totalBalance||0).toFixed(2)}
        </div>
      </div>`;
    };

    const tGrand = billsToPrint.reduce((s,b)=>s+(+b.finalAmount||0),0);
    const tPaid  = billsToPrint.reduce((s,b)=>s+(+b.receivedAmount||0),0);
    const tDue   = billsToPrint.reduce((s,b)=>s+(+b.totalBalance||0),0);

    const html = `<!DOCTYPE html><html><head><title>Invoice &#8212; ${record.patientName}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI', Arial, sans-serif;margin:0;padding:28px;color:#1e293b;font-size:13px}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid ${accentColor}">
  <div style="display:flex;flex-direction:column;align-items:flex-start">
    ${clinicLogo ? `<img src="${clinicLogo}" style="max-height:80px;max-width:240px;object-fit:contain;margin-bottom:10px" />` : `<h2 style="margin:0;color:${accentColor};font-size:24px;font-weight:900;margin-bottom:10px">${clinicName}</h2>`}
    <div style="display:flex;align-items:center;gap:6px;font-size:1.15rem;font-weight:800;color:#000">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      ${clinicPhone}
    </div>
    <p style="margin:6px 0 0;color:#64748b;font-size:13px;font-weight:600">Medical Invoice &#8212; ${sourceType==='DayCare'?'Day Care':'Home Care'} Billing</p>
  </div>
  <div style="text-align:right">
    <div style="font-size:22px;font-weight:900;color:${accentColor};letter-spacing:2px">INVOICE</div>
    <div style="color:#64748b;font-size:12px;margin-top:4px;font-weight:600">Printed: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
  <div style="background:#f8fafc;padding:14px;border-radius:8px">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Bill To</div>
    <div style="font-weight:700;font-size:15px">${record.patientName||'—'}</div>
    <div style="color:#64748b;margin-top:3px">${record.patientGender||''} &#183; ${record.patientAge||''} yrs</div>
    ${record.uhid?`<div style="color:#64748b">UHID: ${record.uhid}</div>`:''}
  </div>
  <div style="background:#f8fafc;padding:14px;border-radius:8px">
    <div style="font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;margin-bottom:8px">Grand Summary</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total Bills</span><span>${billsToPrint.length}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Grand Total</span><span style="font-weight:700">&#8377; ${tGrand.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#059669"><span>Total Paid</span><span style="font-weight:700">&#8377; ${tPaid.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid #e2e8f0;font-weight:700;font-size:14px">
      <span style="color:${tDue>0?'#dc2626':'#059669'}">Balance Due</span>
      <span style="color:${tDue>0?'#dc2626':'#059669'}">&#8377; ${tDue.toFixed(2)}</span>
    </div>
  </div>
</div>
${billsToPrint.map((b,i)=>makeRows(b,i)).join('')}
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
  Thank you for choosing ${clinicName} &#183; Computer-generated invoice
  <div style="margin-top:6px;font-size:10px;font-weight:600;color:#cbd5e1">Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
</div>
</body></html>`;

    const subject = `Your Invoice from ${clinicName}`;
    const body = `<p>Dear ${record.patientName},</p><p>Please find attached your medical invoice for ${sourceType === 'DayCare' ? 'Day Care' : 'Home Care'} services.</p>`;

    try {
      await sendDocumentAsEmail(html, targetEmail, subject, body, 'Invoice.pdf');
      alert(`Email successfully sent to ${targetEmail}`);
    } catch (err) {
      console.error("Error sending email:", err);
      alert('Failed to send email. Ensure backend is configured properly.');
    }
  };

  /* ── Utilities ──────────────────────────────────────────────── */
  const fmt     = (n) => `₹ ${(+n || 0).toFixed(2)}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDt   = (d) => d ? new Date(d).toLocaleString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const modeIcon = (m) => {
    if (m === 'CASH') return <Banknote size={13} />;
    if (m === 'UPI')  return <Smartphone size={13} />;
    return <CreditCard size={13} />;
  };

  const totalPaymentsCount = bills.reduce((s, b) => s + (b.payments?.length || 0), 0);
  const grandBalance       = bills.reduce((s, b) => s + (b.totalBalance || 0), 0);

  const inpStyle = {
    fontSize: '0.85rem', border: '1.5px solid #e2e8f0',
    borderRadius: 8, padding: '6px 10px', width: '100%', outline: 'none', background: '#fff'
  };

  const TABS = [
    { id: 'addBill',  label: 'Add Bill' },
    { id: 'bills',    label: `Bills (${bills.length})` },
    { id: 'payments', label: `Payments (${totalPaymentsCount})` },
  ];

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog" style={{ maxWidth: 1020, margin: '1.5rem auto' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>

          {/* ── Header ───────────────────────────────────────── */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: accentBg }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-2 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                <Receipt size={20} className="text-white" />
              </div>
              <div>
                <div className="text-white fw-bold" style={{ fontSize: '1rem' }}>Billing — {record.patientName}</div>
                <div className="text-white small opacity-75">
                  {sourceType === 'DayCare' ? 'Day Care' : 'Home Care'} Record
                  {record.uhid && ` · #${record.uhid}`}
                  {record.patientAge && ` · ${record.patientAge} yrs`}
                  {record.patientGender && ` · ${record.patientGender}`}
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {grandBalance > 0 && (
                <div className="px-3 py-2 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <AlertCircle size={14} className="text-white" />
                  <span className="text-white fw-bold" style={{ fontSize: '0.82rem' }}>Due: ₹ {grandBalance.toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <User size={14} className="text-white" />
                <span className="text-white fw-semibold" style={{ fontSize: '0.82rem' }}>Billed by: {currentUser}</span>
              </div>
              <button className="btn text-white p-2" style={{ borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="d-flex border-bottom" style={{ backgroundColor: '#fafaf9' }}>
            {TABS.map(t => (
              <button key={t.id} className="btn btn-sm py-3 px-4 border-0 rounded-0"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: activeTab === t.id ? accentColor : '#64748b',
                  borderBottom: activeTab === t.id ? `3px solid ${accentColor}` : '3px solid transparent',
                  backgroundColor: 'transparent' }}
                onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Body ─────────────────────────────────────────── */}
          <div className="d-flex" style={{ minHeight: 500, maxHeight: '70vh' }}>

            {/* ADD BILL TAB */}
            {activeTab === 'addBill' && (
              <div className="d-flex flex-grow-1 overflow-hidden">
                <div className="flex-grow-1 p-4 overflow-auto bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-secondary" style={{ fontSize: '0.82rem' }}>Bill Date:</span>
                      <input type="date" className="form-control form-control-sm shadow-none" style={{ width: 'auto' }}
                        value={billDate} onChange={e => setBillDate(e.target.value)} />
                    </div>
                    <span className="badge px-3 py-2" style={{ backgroundColor: accentColor + '18', color: accentColor, borderRadius: 20, fontSize: '0.78rem' }}>
                      <User size={11} className="me-1" />Billed by: {currentUser}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table table-bordered align-middle mb-3" style={{ fontSize: '0.82rem', minWidth: 640 }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th style={{ width: 32 }}>#</th>
                          <th style={{ minWidth: 200 }}>Service / Item</th>
                          <th style={{ width: 70 }}>Qty</th>
                          <th style={{ width: 120 }}>Unit Price (₹)</th>
                          <th style={{ width: 80 }}>GST %</th>
                          <th style={{ width: 110 }}>Discount (₹)</th>
                          <th style={{ width: 100 }}>Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const up   = parseFloat(item.unitPrice) || 0;
                          const q    = parseInt(item.qty) || 1;
                          const gst  = parseFloat(item.gstPercent) || 0;
                          const disc = parseFloat(item.discount) || 0;
                          const tot  = Math.max(0, (up * q - disc) * (1 + gst / 100));
                          return (
                            <tr key={i}>
                              <td className="text-center text-secondary fw-bold">{i + 1}</td>
                              <td><input style={inpStyle} value={item.serviceName} placeholder="Service name..." onChange={e => editItem(i, 'serviceName', e.target.value)} /></td>
                              <td><input style={inpStyle} type="number" min={1} value={item.qty} onChange={e => editItem(i, 'qty', e.target.value)} /></td>
                              <td><input style={inpStyle} type="number" min={0} value={item.unitPrice} placeholder="0.00" onChange={e => editItem(i, 'unitPrice', e.target.value)} /></td>
                              <td><input style={inpStyle} type="number" min={0} max={100} value={item.gstPercent} onChange={e => editItem(i, 'gstPercent', e.target.value)} /></td>
                              <td><input style={inpStyle} type="number" min={0} value={item.discount} onChange={e => editItem(i, 'discount', e.target.value)} /></td>
                              <td className="fw-bold" style={{ color: accentColor }}>₹ {tot.toFixed(2)}</td>
                              <td className="text-center">
                                <button className="btn btn-sm p-1 rounded-circle" style={{ border: '1px solid #fca5a5', color: '#ef4444' }}
                                  onClick={() => removeItem(i)} disabled={items.length === 1}>
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button className="btn btn-sm rounded-pill px-4 mb-4"
                    style={{ border: `1.5px solid ${accentColor}`, color: accentColor, fontSize: '0.82rem' }}
                    onClick={addItem}>
                    <PlusCircle size={13} className="me-1" /> Add Row
                  </button>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label mb-1" style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Deposit Amount (₹)</label>
                      <input type="number" min={0} className="form-control shadow-none"
                        style={{ fontSize: '0.88rem', border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={depositAmount} placeholder="0.00" onChange={e => setDeposit(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label mb-1" style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Discount Type</label>
                      <select className="form-select shadow-none" style={{ fontSize: '0.88rem', border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                        value={discountType} onChange={e => setDiscountType(e.target.value)}>
                        <option value="none">No Discount</option>
                        <option value="percent">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>
                    {discountType !== 'none' && (
                      <div className="col-md-4">
                        <label className="form-label mb-1" style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Discount {discountType === 'percent' ? '(%)' : '(₹)'}
                        </label>
                        <input type="number" min={0} className="form-control shadow-none"
                          style={{ fontSize: '0.88rem', border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                          value={discountValue} placeholder="0" onChange={e => setDiscountValue(e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Summary */}
                <div className="bg-white border-start d-flex flex-column" style={{ width: 290, flexShrink: 0 }}>
                  <div className="p-4" style={{ backgroundColor: '#fafaf9', borderBottom: '1px solid #e2e8f0' }}>
                    <h6 className="fw-bold mb-3" style={{ fontSize: '0.9rem' }}>Bill Summary</h6>
                    {[
                      ['Total Billed', `₹ ${computedTotals.totalBilledAmount.toFixed(2)}`],
                      ['Discount',     `- ₹ ${computedTotals.totalDiscount.toFixed(2)}`],
                      ['GST / Tax',    `₹ ${computedTotals.totalTax.toFixed(2)}`],
                      ['Final Amount', `₹ ${computedTotals.finalAmount.toFixed(2)}`],
                      ['Deposit',      `₹ ${(parseFloat(depositAmount) || 0).toFixed(2)}`],
                    ].map(([l, v]) => (
                      <div key={l} className="d-flex justify-content-between mb-2 small">
                        <span className="text-secondary">{l}</span>
                        <span className="fw-bold">{v}</span>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between pt-2 border-top">
                      <span className="fw-bold" style={{ fontSize: '0.88rem' }}>Balance Due</span>
                      <span className="fw-bold fs-5" style={{ color: accentColor }}>₹ {computedTotals.totalBalance.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="p-4 flex-grow-1 d-flex flex-column">
                    <button className="btn fw-bold w-100 mt-auto"
                      style={{ background: accentBg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: '0.9rem' }}
                      disabled={saving} onClick={handleSaveBill}>
                      {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : '💾  Save Bill'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BILLS TAB */}
            {activeTab === 'bills' && (
              <div className="flex-grow-1 p-4 overflow-auto bg-white">
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" style={{ color: accentColor }} />
                    <span className="text-secondary">Loading bills...</span>
                  </div>
                ) : bills.length === 0 ? (
                  <div className="d-flex flex-column align-items-center justify-content-center py-5 text-secondary">
                    <FileText size={36} className="mb-3 opacity-25" />
                    <div className="fw-semibold mb-1">No bills yet</div>
                    <div className="small">Switch to "Add Bill" to create one.</div>
                  </div>
                ) : bills.map((bill, bi) => {
                  const isPaid = bill.totalBalance <= 0;
                  const ps     = getBillPay(bill._id);
                  return (
                    <div key={bill._id} className="mb-4 rounded-3 shadow-sm border overflow-hidden">

                      {/* Bill header */}
                      <div className="d-flex justify-content-between align-items-center px-4 py-3"
                        style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-bold" style={{ fontSize: '0.95rem' }}>Bill #{bi + 1}</span>
                            <span className="badge px-2 py-1 rounded-pill"
                              style={{ backgroundColor: isPaid ? '#d1fae5' : '#fef3c7', color: isPaid ? '#059669' : '#d97706', fontSize: '0.72rem' }}>
                              {isPaid ? <><CheckCircle size={11} className="me-1" />Paid</> : <><AlertCircle size={11} className="me-1" />Balance Due</>}
                            </span>
                          </div>
                          <div className="text-secondary small">{fmtDate(bill.billDate)}</div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <div className="text-end">
                            <div className="fw-bold" style={{ fontSize: '1.1rem', color: accentColor }}>₹ {(+bill.finalAmount).toFixed(2)}</div>
                            <div className="small text-secondary">Paid: ₹ {(+bill.receivedAmount).toFixed(2)}</div>
                          </div>
                          <button className="btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
                            style={{ border: `1.5px solid ${accentColor}`, color: accentColor, backgroundColor: accentColor + '12', fontSize: '0.75rem' }}
                            onClick={() => doPrint([bill])}>
                            <Printer size={12} /> Print
                          </button>
                          <button className="btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
                            style={{ border: `1.5px solid ${accentColor}`, color: accentColor, backgroundColor: accentColor + '12', fontSize: '0.75rem' }}
                            onClick={() => doEmail([bill])}>
                            <Mail size={12} /> Email
                          </button>
                        </div>
                      </div>

                      {bill.billedBy && (
                        <div className="px-4 py-2 d-flex align-items-center gap-2"
                          style={{ backgroundColor: accentColor + '08', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                          <User size={13} style={{ color: accentColor }} />
                          <span className="text-secondary">Billed by:</span>
                          <span className="fw-bold" style={{ color: accentColor }}>{bill.billedBy}</span>
                        </div>
                      )}

                      {/* Items */}
                      <div className="px-4 py-3" style={{ overflowX: 'auto' }}>
                        <table className="table table-sm table-borderless mb-2" style={{ fontSize: '0.8rem', minWidth: 500 }}>
                          <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                              <th>#</th><th>Service</th>
                              <th className="text-center">Qty</th>
                              <th className="text-end">Unit Price</th>
                              <th className="text-center">GST%</th>
                              <th className="text-end">Discount</th>
                              <th className="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(bill.items || []).map((it, ii) => (
                              <tr key={ii}>
                                <td>{ii + 1}</td>
                                <td className="fw-semibold">{it.serviceName}</td>
                                <td className="text-center">{it.qty}</td>
                                <td className="text-end">₹ {(+it.unitPrice).toFixed(2)}</td>
                                <td className="text-center">{it.gstPercent}%</td>
                                <td className="text-end text-danger">-₹ {(+it.discount).toFixed(2)}</td>
                                <td className="text-end fw-bold" style={{ color: accentColor }}>₹ {(+it.totalPrice).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="d-flex justify-content-end gap-4 pt-2 border-top" style={{ fontSize: '0.8rem' }}>
                          {[['Total', bill.totalBilledAmount], ['Discount', `- ₹ ${(+bill.totalDiscount).toFixed(2)}`],
                            ['Tax', `₹ ${(+bill.totalTax).toFixed(2)}`], ['Final', `₹ ${(+bill.finalAmount).toFixed(2)}`],
                            ['Balance', `₹ ${(+bill.totalBalance).toFixed(2)}`]]
                            .map(([l, v]) => (
                              <div key={l} className="text-center">
                                <div className="text-secondary" style={{ fontSize: '0.7rem' }}>{l}</div>
                                <div className="fw-bold">{typeof v === 'number' ? `₹ ${v.toFixed(2)}` : v}</div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Payment history */}
                      {bill.payments?.length > 0 && (
                        <div className="px-4 pb-3 border-top pt-3" style={{ backgroundColor: '#fafaf9' }}>
                          <div className="small fw-semibold text-secondary mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Payment History</div>
                          <div className="d-flex flex-column gap-1">
                            {bill.payments.map((p, pi) => (
                              <div key={pi} className="d-flex align-items-center gap-2 px-3 py-2 rounded-2" style={{ backgroundColor: '#f0fdf4', fontSize: '0.8rem' }}>
                                <CheckCircle size={12} style={{ color: '#059669', flexShrink: 0 }} />
                                <span className="fw-bold text-success">₹ {(+p.amount).toFixed(2)}</span>
                                <span className="badge" style={{ backgroundColor: '#059669' + '20', color: '#059669', fontSize: '0.68rem' }}>{p.paymentMode}</span>
                                {p.purpose && <span className="text-muted small">· {p.purpose}</span>}
                                <span className="text-muted ms-auto" style={{ fontSize: '0.7rem' }}>
                                  <Calendar size={10} className="me-1" />{fmtDate(p.paidAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Record payment toggle */}
                      {!isPaid && (
                        <div className="border-top">
                          <button className="btn w-100 d-flex align-items-center justify-content-between px-4 py-2 rounded-0 border-0"
                            style={{ backgroundColor: accentColor + '12', color: accentColor, fontWeight: 600, fontSize: '0.82rem' }}
                            onClick={() => togglePayOpen(bill._id)}>
                            <span>💳 Record Payment · Balance: <strong>₹ {bill.totalBalance.toFixed(2)}</strong></span>
                            {(payState[bill._id]?.open) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {payState[bill._id]?.open && (
                            <div className="px-4 py-3" style={{ backgroundColor: '#fafaf9' }}>
                              <div className="d-flex gap-2 flex-wrap align-items-end">
                                <div style={{ flex: '0 0 130px' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Mode</label>
                                  <select className="form-select form-select-sm shadow-none"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                                    value={ps.mode} onChange={e => setPayField(bill._id, 'mode', e.target.value)}>
                                    <option value="CASH">💵 CASH</option>
                                    <option value="UPI">📱 UPI</option>
                                    <option value="CARD">💳 CARD</option>
                                    <option value="NETBANKING">🏦 Net Banking</option>
                                  </select>
                                </div>
                                <div style={{ flex: '0 0 150px' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                                  <input type="number" className="form-control form-control-sm shadow-none"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                                    value={ps.amount}
                                    placeholder={`Max ₹${bill.totalBalance.toFixed(2)}`}
                                    onChange={e => setPayField(bill._id, 'amount', e.target.value)} />
                                </div>
                                <div className="flex-grow-1">
                                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Remarks</label>
                                  <input type="text" className="form-control form-control-sm shadow-none"
                                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8 }}
                                    value={ps.details} placeholder="Transaction ref / notes..."
                                    onChange={e => setPayField(bill._id, 'details', e.target.value)} />
                                </div>
                                <button className="btn btn-sm fw-bold px-4"
                                  style={{ background: accentBg, color: '#fff', border: 'none', borderRadius: 8, whiteSpace: 'nowrap' }}
                                  disabled={ps.paying} onClick={() => handlePay(bill)}>
                                  {ps.paying ? <span className="spinner-border spinner-border-sm" /> : `💳 Pay ₹ ${ps.amount || '0'}`}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isPaid && (
                        <div className="px-4 py-2 d-flex align-items-center gap-2" style={{ backgroundColor: '#d1fae5', fontSize: '0.82rem' }}>
                          <CheckCircle size={14} className="text-success" />
                          <span className="text-success fw-bold">Fully Paid</span>
                          <span className="text-secondary ms-1">— All payments received.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div className="flex-grow-1 overflow-auto bg-white">
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" style={{ color: accentColor }} />
                    <span className="text-secondary">Loading...</span>
                  </div>
                ) : totalPaymentsCount === 0 ? (
                  <div className="d-flex flex-column align-items-center justify-content-center py-5 text-secondary" style={{ minHeight: 300 }}>
                    <CreditCard size={42} className="mb-3 opacity-25" />
                    <div className="fw-semibold mb-1">No payments recorded yet</div>
                    <div className="small text-center px-4">
                      Go to the <strong>Bills</strong> tab and click <strong>"Record Payment"</strong> on any unpaid bill.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Grand summary strip */}
                    <div className="d-flex gap-3 p-3 border-bottom flex-wrap" style={{ backgroundColor: '#f8fafc' }}>
                      {[
                        { label: 'Grand Total',    val: bills.reduce((s, b) => s + (+b.finalAmount || 0), 0),    color: '#1d4ed8', bg: '#eff6ff' },
                        { label: 'Total Received', val: bills.reduce((s, b) => s + (+b.receivedAmount || 0), 0), color: '#059669', bg: '#f0fdf4' },
                        { label: 'Balance Due',    val: grandBalance, color: grandBalance > 0 ? '#dc2626' : '#059669', bg: grandBalance > 0 ? '#fef2f2' : '#f0fdf4' },
                      ].map(c => (
                        <div key={c.label} className="rounded-3 px-3 py-2 d-flex flex-column" style={{ backgroundColor: c.bg, minWidth: 150 }}>
                          <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</span>
                          <span className="fw-bold" style={{ fontSize: '1.05rem', color: c.color }}>₹ {c.val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payments grouped by bill */}
                    <div className="p-3">
                      {bills.filter(b => b.payments?.length > 0).map((bill, bi) => (
                        <div key={bill._id} className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fw-bold text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              Bill #{bills.indexOf(bill) + 1} · {fmtDate(bill.billDate)}
                            </span>
                            <span className="badge px-2 py-1 rounded-pill"
                              style={{ backgroundColor: bill.totalBalance <= 0 ? '#d1fae5' : '#fef3c7', color: bill.totalBalance <= 0 ? '#059669' : '#d97706', fontSize: '0.68rem' }}>
                              {bill.totalBalance <= 0 ? '✓ Paid' : `Due ₹ ${bill.totalBalance.toFixed(2)}`}
                            </span>
                          </div>
                          {bill.payments.map((pmt, pi) => (
                            <div key={pi} className="d-flex align-items-center gap-3 p-3 mb-2 rounded-3 border" style={{ backgroundColor: '#fafaf9' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 40, height: 40, backgroundColor: accentColor + '18', color: accentColor }}>
                                {modeIcon(pmt.paymentMode)}
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold" style={{ fontSize: '0.95rem' }}>₹ {(+pmt.amount).toFixed(2)}</span>
                                  <span className="badge px-2" style={{ backgroundColor: accentColor + '18', color: accentColor, fontSize: '0.7rem' }}>{pmt.paymentMode}</span>
                                </div>
                                {pmt.purpose && <div className="text-secondary small mt-1">{pmt.purpose}</div>}
                              </div>
                              <div className="text-secondary small text-end">
                                <Calendar size={11} className="me-1" />{fmtDt(pmt.paidAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ backgroundColor: '#f8fafc' }}>
            <div className="d-flex align-items-center gap-2 text-secondary small">
              <Info size={14} />
              <span>
                {sourceType} billing for <strong>{record.patientName}</strong>
                {record.admissionDate && <> · Admitted: {fmtDate(record.admissionDate)}</>}
                {record.startDate && <> · Started: {fmtDate(record.startDate)}</>}
              </span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => doPrint(bills)}>
                <Printer size={13} className="me-1" />Print All
              </button>
              <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => doEmail(bills)}>
                <Mail size={13} className="me-1" />Email All
              </button>
              <button className="btn btn-sm rounded-pill px-4 fw-bold"
                style={{ backgroundColor: accentColor, color: '#fff', border: 'none' }} onClick={onClose}>
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CareRecordBillModal;
