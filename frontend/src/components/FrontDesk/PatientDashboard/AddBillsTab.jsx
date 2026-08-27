import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import frontdeskService from '../../../services/frontdeskService';
import { getLocalDateString } from '../../../utils/dateUtils';
import {  Plus, Trash2, Printer, Share2, CheckCircle, X,
  ChevronDown, Receipt, Tag, Percent, DollarSign, Loader, Edit3
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt  = n  => `₹ ${parseFloat(n||0).toFixed(2)}`;
const pct  = n  => `${parseFloat(n||0)}%`;
const API  = `${import.meta.env.VITE_API_URL}/services/`;
const cfg  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const EMPTY_ITEM = { serviceName:'', qty:1, unitPrice:0, gstPercent:0, discount:0, totalPrice:0 };

/* ─── Service Search Dropdown ──────────────────────────────────── */
const ServiceInput = ({ value, services, onChange, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const matches = services.filter(s => (s?.serviceName || '').toLowerCase().includes((value || '').toLowerCase())).slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="position-relative" ref={ref} style={{ minWidth: 180 }}>
      <input
        className="form-control form-control-sm shadow-none"
        style={{ border: 'none', borderRadius: 0, fontSize: '0.83rem' }}
        value={value}
        placeholder="Search service..."
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div className="position-absolute start-0 bg-white shadow-lg rounded-3 z-3 overflow-hidden" style={{ top: '100%', minWidth: 240, border: '1px solid #e2e8f0', zIndex: 100 }}>
          {matches.map(s => (
            <div key={s._id}
              className="px-3 py-2 d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer', fontSize: '0.83rem', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
              onClick={() => { onSelect(s); setOpen(false); }}>
              <span className="fw-semibold text-dark">{s.serviceName}</span>
              {s.price > 0 && <span className="text-success fw-bold small">₹{s.price}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Print Invoice ────────────────────────────────────────────── */
const generateInvoiceHTML = (bill, patient) => {
  const rows = (bill.items || []).map((item, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.serviceName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${parseFloat(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.gstPercent}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626">- ₹${parseFloat(item.discount).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">₹${parseFloat(item.totalPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><title>Invoice</title>
  <style>
  @page { margin: 0; size: A4; }
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #2563eb">
    <div><h2 style="margin:0;color:#1d4ed8">${localStorage.getItem('clinicName') || 'mediplix'}</h2><p style="margin:4px 0 0;color:#64748b;font-size:13px">Medical Invoice / Receipt</p></div>
    <div style="text-align:right;font-size:13px">
      <div style="font-size:18px;font-weight:900;color:#2563eb">INVOICE</div>
      <div style="color:#64748b;margin-top:4px">Date: ${new Date(bill.billDate||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
      <div style="margin-top:4px;font-weight:700;color:${bill.totalBalance>0?'#dc2626':'#059669'}">Status: ${bill.totalBalance>0?'UNPAID':'PAID'}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;font-size:13px">
    <div style="background:#f8fafc;padding:14px;border-radius:8px">
      <div style="font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:8px">Bill To</div>
      <div style="font-weight:700;font-size:16px">${patient?.name || '—'}</div>
      <div style="color:#64748b;margin-top:2px">${patient?.gender||''} · ${patient?.age?patient.age+' yrs':''}</div>
      <div style="color:#64748b">${patient?.phone||''}</div>
      <div style="color:#64748b">Patient ID: ${patient?.patientId||''}</div>
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:8px;text-align:right">
      <div style="font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:8px">Amount Summary</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#64748b">Total Billed</span><span style="font-weight:600">₹${parseFloat(bill.totalBilledAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#dc2626">Discount</span><span style="color:#dc2626">-₹${parseFloat(bill.totalDiscount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b">GST</span><span style="font-weight:600">+₹${parseFloat(bill.totalTax||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1.5px solid #e2e8f0"><span style="font-weight:700">Final</span><span style="font-weight:900;color:#1d4ed8">₹${parseFloat(bill.finalAmount||0).toFixed(2)}</span></div>
    </div>
  </div>
  <table style="margin-bottom:24px">
    <thead><tr><th>#</th><th>Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <div style="min-width:280px;background:#f8fafc;padding:18px;border-radius:12px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:#64748b">Total Billed</span><span style="font-weight:600">₹${parseFloat(bill.totalBilledAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:#dc2626">Discount</span><span style="color:#dc2626">- ₹${parseFloat(bill.totalDiscount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:#64748b">Tax (GST)</span><span style="font-weight:600">+ ₹${parseFloat(bill.totalTax||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid #e2e8f0;font-size:16px;font-weight:900;margin-bottom:10px"><span>Final Amount</span><span style="color:#1d4ed8">₹${parseFloat(bill.finalAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#059669">Received</span><span style="color:#059669;font-weight:600">₹${parseFloat(bill.receivedAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700"><span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">Balance Due</span><span style="color:${bill.totalBalance>0?'#dc2626':'#059669'}">₹${parseFloat(bill.totalBalance||0).toFixed(2)}</span></div>
    </div>
  </div>
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">Thank you for choosing mediplix · This is a computer-generated invoice</div>
  </body></html>`;
};

/* ─── Main Component ───────────────────────────────────────────── */
const AddBillsTab = ({ patient }) => {
  const [services,    setServices]    = useState([]);
  const [bill,        setBill]        = useState(null);
  const [items,       setItems]       = useState([{ ...EMPTY_ITEM }]);
  const [billDate,    setBillDate]    = useState(getLocalDateString());
  const [discType,    setDiscType]    = useState('none');   // none | percent | flat
  const [discValue,   setDiscValue]   = useState('');
  const [payMode,     setPayMode]     = useState('CASH');
  const [payAmt,      setPayAmt]      = useState('');
  const [payNote,     setPayNote]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [paying,      setPaying]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [mode,        setMode]        = useState('edit');   // edit | view
  const printRef = useRef();

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load services and existing bill
  useEffect(() => {
    axios.get(API, cfg()).then(r => setServices(r.data)).catch(() => {});
    frontdeskService.getBills({ patientId: patient.patientId }).then(bills => {
      if (bills && bills.length > 0) {
        const b = bills[0];
        setBill(b);
        setItems(b.items.length ? b.items.map(i => ({ ...i })) : [{ ...EMPTY_ITEM }]);
        setBillDate(b.billDate ? getLocalDateString(new Date(b.billDate)) : billDate);
        setMode('view');
      }
    }).catch(() => {});
  }, [patient]);

  // Live totals
  const totals = useMemo(() => {
    let billed = 0, disc = 0, tax = 0;
    items.forEach(it => {
      const lp = (parseFloat(it.unitPrice)||0) * (parseInt(it.qty)||1);
      const d  = parseFloat(it.discount)||0;
      const t  = parseFloat(it.gstPercent)||0;
      const taxAmt = parseFloat(((lp-d)*t/100).toFixed(2));
      billed += lp;
      disc   += d;
      tax    += taxAmt;
    });
    let extraDisc = 0;
    if (discType==='percent') extraDisc = parseFloat(((billed-disc)*parseFloat(discValue||0)/100).toFixed(2));
    else if (discType==='flat') extraDisc = parseFloat(discValue||0);
    disc += extraDisc;
    const final = Math.max(0, billed - disc + tax);
    const received = bill?.receivedAmount || 0;
    const balance  = Math.max(0, final - received);
    return { billed, disc, tax, final, received, balance };
  }, [items, discType, discValue, bill]);

  // Update line item field
  const setField = (idx, key, val) => {
    setItems(its => {
      const n = [...its];
      n[idx] = { ...n[idx], [key]: val };
      // Recompute totalPrice
      const it = n[idx];
      const lp = (parseFloat(it.unitPrice)||0)*(parseInt(it.qty)||1);
      const d  = parseFloat(it.discount)||0;
      const t  = parseFloat(it.gstPercent)||0;
      n[idx].totalPrice = parseFloat((lp - d + (lp-d)*t/100).toFixed(2));
      return n;
    });
  };

  const selectService = (idx, svc) => {
    setItems(its => {
      const n = [...its];
      n[idx] = { ...n[idx], serviceName: svc.serviceName, unitPrice: svc.price||0, discount: 0 };
      const lp = (svc.price||0) * (parseInt(n[idx].qty)||1);
      n[idx].totalPrice = lp;
      return n;
    });
  };

  const addRow    = () => setItems(its => [...its, { ...EMPTY_ITEM }]);
  const removeRow = idx => setItems(its => its.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (items.every(i => !i.serviceName)) return showToast('Add at least one service', 'error');
    setSaving(true);
    try {
      const payload = {
        patientId: patient.patientId,
        items: items.filter(i => i.serviceName),
        billDate,
        depositAmount: 0,
        discountType: discType === 'none' ? null : discType,
        discountValue: discValue,
      };
      let saved;
      if (bill) saved = await frontdeskService.updateBill(bill._id, payload);
      else       saved = await frontdeskService.createBill(payload);
      setBill(saved);
      setItems(saved.items.map(i => ({ ...i })));
      setMode('view');
      showToast(bill ? 'Bill updated!' : 'Bill created!');
    } catch (e) {
      showToast('Error saving bill: ' + (e.response?.data?.message || e.message), 'error');
    } finally { setSaving(false); }
  };

  const handlePay = async () => {
    if (!bill) return showToast('Save the bill first', 'error');
    if (!payAmt || parseFloat(payAmt) <= 0) return showToast('Enter a valid amount', 'error');
    setPaying(true);
    try {
      const updated = await frontdeskService.payBill(bill._id, {
        amount: parseFloat(payAmt),
        paymentMode: payMode,
        purpose: payNote
      });
      setBill(updated);
      setPayAmt('');
      setPayNote('');
      showToast('Payment recorded!');
    } catch (e) { showToast('Payment failed', 'error'); }
    finally { setPaying(false); }
  };

  const handlePrint = () => {
    // Build bill data from live state (works even before saving)
    const printData = bill
      ? { ...bill, totalBilledAmount: totals.billed, totalDiscount: totals.disc, totalTax: totals.tax, finalAmount: totals.final, totalBalance: totals.balance }
      : { items, billDate, totalBilledAmount: totals.billed, totalDiscount: totals.disc, totalTax: totals.tax, finalAmount: totals.final, totalBalance: totals.balance, receivedAmount: 0 };

    const html = generateInvoiceHTML(printData, patient);

    // Use hidden iframe to avoid popup blockers
    let iframe = document.getElementById('bill-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'bill-print-frame';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0';
      document.body.appendChild(iframe);
    }
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    // Wait for resources to load then print
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    // Fallback trigger
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e) {}
    }, 600);
  };

  const handleShare = async () => {
    const lines = [
      `BILL — Dr. Aswini Rana Clinic`,
      `Patient: ${patient.name} (${patient.patientId})`,
      `Date: ${new Date(billDate).toLocaleDateString('en-IN')}`,
      ``,
      ...items.filter(i=>i.serviceName).map((i,idx)=>`${idx+1}. ${i.serviceName} x${i.qty} = ₹${parseFloat(i.totalPrice||0).toFixed(2)}`),
      ``,
      `Total: ₹${totals.billed.toFixed(2)}`,
      `Discount: -₹${totals.disc.toFixed(2)}`,
      `GST: +₹${totals.tax.toFixed(2)}`,
      `Final: ₹${totals.final.toFixed(2)}`,
      `Balance Due: ₹${totals.balance.toFixed(2)}`,
    ].join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Bill', text: lines }); return; } catch(e) {}
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(lines);
      showToast('Bill summary copied to clipboard!');
    } catch(e) { showToast('Could not share bill', 'error'); }
  };

  const isUnpaid  = totals.balance > 0;
  const b = bill;

  return (
    <div className="d-flex h-100 overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>

      {/* Toast */}
      {toast && (
        <div className="position-fixed top-0 end-0 m-3 alert shadow-lg d-flex align-items-center gap-2 py-2 px-3"
          style={{ zIndex: 9999, borderRadius: 12, backgroundColor: toast.type==='success'?'#d1fae5':'#fee2e2', border: `1.5px solid ${toast.type==='success'?'#6ee7b7':'#fca5a5'}`, color: toast.type==='success'?'#065f46':'#7f1d1d', fontSize: '0.88rem', fontWeight: 600 }}>
          {toast.type==='success' ? <CheckCircle size={16}/> : <X size={16}/>} {toast.msg}
        </div>
      )}

      {/* ── Left Panel: Bill Items ── */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ minWidth: 0 }}>

        {/* Bill header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 bg-white" style={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, backgroundColor: '#eff6ff' }}>
              <Receipt size={18} style={{ color: '#2563eb' }}/>
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>Add Bill</div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{patient.name} · {patient.patientId}</div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Bill date */}
            <div className="d-flex align-items-center gap-2">
              <label className="small fw-semibold text-secondary mb-0">Bill Date:</label>
              <input type="date" className="form-control form-control-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', width: 140 }}
                value={billDate} onChange={e => setBillDate(e.target.value)} disabled={mode==='view'}/>
              <button className="btn btn-sm rounded-pill px-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.75rem' }}
                onClick={() => setBillDate(getLocalDateString())}>Today</button>
            </div>

            {/* Status badge */}
            {b && (
              <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: isUnpaid?'#fee2e2':'#d1fae5', color: isUnpaid?'#dc2626':'#059669', fontWeight: 700, fontSize: '0.75rem' }}>
                {isUnpaid ? `Due ₹${totals.balance.toFixed(2)}` : '✓ Paid'}
              </span>
            )}

            {mode === 'view'
              ? <button className="btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3 fw-semibold" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.8rem' }} onClick={() => setMode('edit')}>
                  <Edit3 size={13}/> Edit Bill
                </button>
              : <button className="btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3 fw-bold" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontSize: '0.82rem' }} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"/>Saving...</> : '💾 Save Bill'}
                </button>
            }
          </div>
        </div>

        {/* Items table */}
        <div className="flex-grow-1 overflow-auto px-4 py-3">
          <table className="table table-borderless mb-0" style={{ fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderRadius: 8 }}>
                <th className="text-secondary fw-semibold py-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 36 }}>#</th>
                <th className="text-secondary fw-semibold py-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Service / Description</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 60 }}>Qty</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 110 }}>Unit Price (₹)</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 70 }}>GST %</th>
                <th className="text-secondary fw-semibold py-2 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 110 }}>Discount (₹)</th>
                <th className="text-secondary fw-semibold py-2 text-right" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 110, textAlign: 'right' }}>Total (₹)</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="py-2 align-middle text-secondary">{idx + 1}</td>
                  <td className="py-2 align-middle" style={{ minWidth: 200 }}>
                    {mode === 'edit' ? (
                      <ServiceInput
                        value={item.serviceName}
                        services={services}
                        onChange={v => setField(idx, 'serviceName', v)}
                        onSelect={svc => selectService(idx, svc)}
                      />
                    ) : (
                      <span className="fw-semibold text-dark">{item.serviceName}</span>
                    )}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={1} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, width: 60 }}
                        value={item.qty} onChange={e => setField(idx, 'qty', e.target.value)}/>
                    ) : <span>{item.qty}</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6 }}
                        value={item.unitPrice} onChange={e => setField(idx, 'unitPrice', e.target.value)}/>
                    ) : <span>₹{parseFloat(item.unitPrice).toFixed(2)}</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} max={100} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, width: 64 }}
                        value={item.gstPercent} onChange={e => setField(idx, 'gstPercent', e.target.value)}/>
                    ) : <span>{item.gstPercent}%</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6 }}
                        value={item.discount} onChange={e => setField(idx, 'discount', e.target.value)}/>
                    ) : <span className="text-danger">-₹{parseFloat(item.discount).toFixed(2)}</span>}
                  </td>
                  <td className="py-2 align-middle fw-bold text-end" style={{ color: '#1d4ed8' }}>
                    ₹{parseFloat(item.totalPrice||0).toFixed(2)}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' && items.length > 1 && (
                      <button className="btn btn-sm p-1 text-danger border-0 bg-transparent" onClick={() => removeRow(idx)}>
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add row + overall discount */}
          {mode === 'edit' && (
            <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
              <button className="btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3" style={{ border: '1.5px dashed #3b82f6', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.8rem' }}
                onClick={addRow}>
                <Plus size={14}/> Add Service
              </button>

              <div className="d-flex align-items-center gap-2">
                <label className="small fw-semibold text-secondary mb-0">Overall Discount:</label>
                <select className="form-select form-select-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, width: 120, fontSize: '0.82rem' }}
                  value={discType} onChange={e => { setDiscType(e.target.value); setDiscValue(''); }}>
                  <option value="none">None</option>
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
                {discType !== 'none' && (
                  <input type="number" min={0} className="form-control form-control-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, width: 90, fontSize: '0.82rem' }}
                    placeholder={discType==='percent'?'e.g. 10':'e.g. 100'} value={discValue} onChange={e => setDiscValue(e.target.value)}/>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bill note */}
        {!bill && (
          <div className="px-4 pb-3 text-secondary small d-flex align-items-center gap-2">
            <span>☆</span> Patient has an appointment on this day. Fill in the services and click Save Bill.
          </div>
        )}
      </div>

      {/* ── Right Panel: Summary + Payment ── */}
      <div className="d-flex flex-column bg-white" style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #e2e8f0', overflowY: 'auto' }}>

        {/* Summary */}
        <div className="p-3 border-bottom">
          <div className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
            <Receipt size={15} style={{ color: '#2563eb' }}/> Bill Summary
          </div>

          {[
            { label: 'Total Billed', value: totals.billed, color: '#1e293b' },
            { label: 'Discount',     value: `-${totals.disc.toFixed(2)}`, color: '#dc2626', prefix:'₹' },
            { label: 'Tax (GST)',    value: `+${totals.tax.toFixed(2)}`, color: '#059669', prefix:'₹' },
          ].map(r => (
            <div key={r.label} className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.82rem' }}>
              <span className="text-secondary">{r.label}</span>
              <span className="fw-semibold" style={{ color: r.color }}>
                {r.prefix||'₹'} {typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
              </span>
            </div>
          ))}

          <div className="d-flex justify-content-between align-items-center pt-2 border-top mb-2">
            <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>Final Amount</span>
            <span className="fw-black" style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>₹ {totals.final.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.82rem' }}>
            <span className="text-secondary">Total Received</span>
            <span className="fw-semibold text-success">₹ {(b?.receivedAmount||0).toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center rounded-3 p-2 mt-2" style={{ backgroundColor: isUnpaid?'#fef2f2':'#f0fdf4', border: `1px solid ${isUnpaid?'#fecaca':'#bbf7d0'}` }}>
            <span className="fw-bold" style={{ color: isUnpaid?'#dc2626':'#059669', fontSize: '0.85rem' }}>Balance Due</span>
            <span className="fw-black" style={{ color: isUnpaid?'#dc2626':'#059669', fontSize: '1rem' }}>₹ {totals.balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment History */}
        {b?.payments?.length > 0 && (
          <div className="p-3 border-bottom">
            <div className="fw-semibold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }}>
              <CheckCircle size={13} style={{ color: '#059669' }}/> Payment History
            </div>
            <div className="d-flex flex-column gap-2">
              {b.payments.map((p, i) => (
                <div key={i} className="d-flex align-items-start justify-content-between rounded-2 px-2 py-2" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.8rem', color: '#059669' }}>₹ {parseFloat(p.amount).toFixed(2)}</div>
                    <div className="text-secondary" style={{ fontSize: '0.7rem' }}>{p.paymentMode} · {p.purpose || 'Payment'}</div>
                    <div className="text-secondary" style={{ fontSize: '0.68rem' }}>{new Date(p.paidAt||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  </div>
                  <span className="badge rounded-pill" style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.65rem' }}>PAID</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record Payment */}
        <div className="p-3 border-bottom">
          <div className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
            <DollarSign size={14} style={{ color: '#059669' }}/>
            {b?.payments?.length > 0 ? 'Add Another Payment' : 'Record Payment'}
          </div>

          {!bill && (
            <div className="p-2 rounded-3 mb-3 text-center" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', fontSize: '0.75rem', color: '#c2410c' }}>
              Save the bill first to record payment
            </div>
          )}

          {/* Purpose */}
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Purpose</label>
            <input className="form-control form-control-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
              placeholder="e.g. Consultation fee, Lab charges..." value={payNote} onChange={e => setPayNote(e.target.value)}/>
          </div>

          {/* Payment Mode */}
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Payment Mode</label>
            <div className="d-flex gap-1 flex-wrap">
              {['CASH','UPI','CARD','NETBANKING'].map(m => (
                <button key={m} className="btn btn-sm rounded-pill px-2" style={{ fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: payMode===m?'#059669':'transparent', color: payMode===m?'#fff':'#64748b',
                  border: payMode===m?'1.5px solid #059669':'1.5px solid #e2e8f0', padding: '3px 10px' }}
                  onClick={() => setPayMode(m)}>{m}</button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text" style={{ border: '1.5px solid #e2e8f0', borderRight: 'none', backgroundColor: '#f8fafc' }}>₹</span>
              <input type="number" min={0} className="form-control shadow-none" style={{ border: '1.5px solid #e2e8f0', borderLeft: 'none' }}
                placeholder={totals.balance > 0 ? totals.balance.toFixed(2) : '0.00'} value={payAmt} onChange={e => setPayAmt(e.target.value)}/>
              <button className="btn btn-sm" style={{ border: '1.5px solid #e2e8f0', borderLeft: 'none', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.72rem' }}
                onClick={() => setPayAmt(totals.balance.toFixed(2))}>Full</button>
            </div>
          </div>

          <button className="btn w-100 fw-bold rounded-pill" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', color: '#fff', border: 'none', fontSize: '0.85rem', padding: '9px' }}
            onClick={handlePay} disabled={paying || !bill || !payAmt}>
            {paying
              ? <><span className="spinner-border spinner-border-sm me-2"/>Processing...</>
              : <>{b?.payments?.length > 0 ? '+ Add Payment' : '💳 Pay'} ₹ {parseFloat(payAmt||0).toFixed(2)}</>}
          </button>
        </div>

        {/* Print / Share */}
        <div className="p-3 d-flex gap-2">
          <button
            className="btn flex-grow-1 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-semibold"
            style={{ border: '1.5px solid #2563eb', color: '#2563eb', fontSize: '0.8rem', backgroundColor: '#eff6ff' }}
            onClick={handlePrint}>
            <Printer size={14}/> Print Invoice
          </button>
          <button
            className="btn flex-grow-1 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-semibold"
            style={{ border: '1.5px solid #059669', color: '#059669', fontSize: '0.8rem', backgroundColor: '#f0fdf4' }}
            onClick={handleShare}>
            <Share2 size={14}/> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBillsTab;
