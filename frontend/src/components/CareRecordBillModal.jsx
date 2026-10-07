import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Printer, Info, PlusCircle, Trash2, Receipt,
  CheckCircle, AlertCircle, CreditCard, Banknote, Smartphone,
  User, Calendar, FileText, ChevronDown, ChevronUp, Mail
} from 'lucide-react';
import clinicService from '../services/clinicService';
import serviceApi from '../services/serviceApi';
import useWebSocket from '../hooks/useWebSocket';
import { sendDocumentAsEmail } from '../services/emailService';
import MergeBillModal from './MergeBillModal';
import { generateA5BillHTML } from '../utils/printA5Bill';

/* ─── Shared Bill Modal for DayCare & HomeCare ──────────────────── */
const CareRecordBillModal = ({
  record, sourceType, service, onClose,
  accentColor = '#b45309',
  accentBg = 'linear-gradient(135deg,#92400e,#d97706)'
}) => {

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bills'); // Default to 'bills' to show existing history
  const [saving, setSaving] = useState(false);

  if (!record) return null;

  // Per-bill payment state keyed by bill._id
  const [payState, setPayState] = useState({});

  const [showMerge, setShowMerge] = useState(false);

  // Add-bill form
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositAmount, setDeposit] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [items, setItems] = useState([newItem()]);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.name || 'Staff'; } catch { return 'Staff'; }
  })();

  const [availableServices, setAvailableServices] = useState([]);

  // Fetch services for autocomplete
  useEffect(() => {
    const typeMap = { 'DayCare': 'Day Care', 'HomeCare': 'Home Care' };
    const stype = typeMap[sourceType] || 'Other';
    serviceApi.getServicesByType(stype)
      .then(res => {
        const services = res || [];
        setAvailableServices(services);
        let servicesArray = [];
        if (record?.serviceType) {
          servicesArray = record.serviceType.split(',').map(s => s.trim()).filter(Boolean);
        } else if (record?.procedures && Array.isArray(record.procedures)) {
          servicesArray = record.procedures.map(p => p.name?.trim()).filter(Boolean);
        }

        if (servicesArray.length > 0) {
          const newItems = servicesArray.map(sName => {
            const matched = services.find(s => s?.serviceName?.toLowerCase() === sName.toLowerCase());
            return {
              serviceName: sName,
                qty: 1,
                unitPrice: matched ? (matched.price || 0) : 0,
                gstPercent: 0,
                discount: 0,
                useCustomService: false
              };
            });
            setItems(newItems);
          }
      })
      .catch(e => console.error('Failed to load services', e));
  }, [sourceType, record]);

  const handleServiceNameChange = (index, val) => {
    setItems(p => {
      const arr = [...p];
      arr[index] = { ...arr[index], serviceName: val };
      const matched = availableServices.find(s => s?.serviceName?.toLowerCase() === val?.toLowerCase());
      if (matched) {
        arr[index] = { ...arr[index], unitPrice: matched.price || 0 };
      }
      return arr;
    });
  };

  function newItem() {
    return { serviceName: '', qty: 1, unitPrice: '', gstPercent: 0, discount: 0, useCustomService: false };
  }

  const loadBills = useCallback(async () => {
    if (!record || !record._id) return;
    setLoading(true);
    try {
      const data = await service.getBills(record._id);
      setBills(data || []);
      if (!data || data.length === 0) {
        setActiveTab('addBill');
      } else {
        setActiveTab('bills');
      }
    } catch (e) {
      console.error('Failed to load bills', e);
    } finally {
      setLoading(false);
    }
  }, [record, service]);

  useEffect(() => { loadBills(); }, [loadBills]);

  useWebSocket({
    BILL_UPDATED: () => loadBills(),
    BILL_CREATED: () => loadBills()
  });

  /* ── Computed Totals ─────────────────────────────────────────── */
  const computedTotals = (() => {
    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;
    items.forEach(item => {
      const up = parseFloat(item.unitPrice) || 0;
      const q = parseInt(item.qty) || 1;
      const gst = parseFloat(item.gstPercent) || 0;
      const disc = parseFloat(item.discount) || 0;
      const lineTotal = up * q;
      const taxAmt = ((lineTotal - disc) * gst) / 100;
      totalBilledAmount += lineTotal;
      totalDiscount += disc;
      totalTax += taxAmt;
    });
    let extraDiscount = 0;
    if (discountType === 'percent') extraDiscount = (totalBilledAmount - totalDiscount) * (parseFloat(discountValue) || 0) / 100;
    else if (discountType === 'flat') extraDiscount = parseFloat(discountValue) || 0;
    totalDiscount += extraDiscount;
    const finalAmount = Math.max(0, totalBilledAmount - totalDiscount + totalTax);
    const dep = parseFloat(depositAmount) || 0;
    const totalBalance = Math.max(0, finalAmount - dep);
    return { totalBilledAmount, totalDiscount, totalTax, finalAmount, totalBalance };
  })();

  /* ── Item CRUD ──────────────────────────────────────────────── */
  const addItem = () => setItems(p => [...p, newItem()]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const editItem = (i, k, v) => setItems(p => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });

  /* ── Save Bill ──────────────────────────────────────────────── */
  const handleSaveBill = async () => {
    if (!items.some(it => it.serviceName?.trim())) { alert('Add at least one service item.'); return; }
    setSaving(true);
    try {
      // Auto-create missing services
      const typeMap = { 'DayCare': 'Day Care', 'HomeCare': 'Home Care' };
      const categoryToSave = typeMap[sourceType] || 'Other';
      for (const it of items) {
        if (it.serviceName && it.serviceName.trim()) {
          const exists = availableServices.some(s => s?.serviceName?.toLowerCase() === it.serviceName?.trim()?.toLowerCase());
          if (!exists) {
            try {
              await serviceApi.createService({
                serviceName: it.serviceName.trim(),
                type: categoryToSave,
                price: parseFloat(it.unitPrice) || 0,
                duration: 30
              });
            } catch (err) { console.error('Failed to auto-create service', err); }
          }
        }
      }

      const payload = {
        [sourceType === 'DayCare' ? 'dayCareId' : 'homeCareId']: record._id,
        patientName: record.patientName,
        items: items.map(it => ({
          serviceName: it.serviceName,
          serviceType: categoryToSave,
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
  const getBillPay = (id) => payState[id] || { amount: '', mode: 'CASH', details: '', paying: false, open: false };
  const setPayField = (id, key, val) => setPayState(ps => ({ ...ps, [id]: { ...getBillPay(id), ...ps[id], [key]: val } }));
  const togglePayOpen = (id) => setPayState(ps => ({ ...ps, [id]: { ...getBillPay(id), ...ps[id], open: !(ps[id]?.open) } }));

  const handlePay = async (bill) => {
    const ps = getBillPay(bill._id);
    const amt = ps.amount ? parseFloat(ps.amount) : 0;
    if (isNaN(amt) || amt < 0) { alert('Enter a valid payment amount.'); return; }
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

    const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';
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
    } catch (err) { }

    let items = [];
    billsToPrint.forEach((b, bi) => {
      const isPaid = b.totalBalance <= 0;
      
      items.push({
        name: `BILL #${bi + 1} (${new Date(b.billDate || b.createdAt).toLocaleDateString('en-IN')}) — ${isPaid ? 'PAID' : 'DUE'}`,
        qty: '', price: '', gst: '', discount: '', total: `₹${(+b.finalAmount || 0).toFixed(2)}`,
        bold: true, color: accentColor
      });

      b.items?.forEach(it => {
        items.push({
          name: it.serviceName,
          qty: it.qty,
          price: `₹${(+it.unitPrice || 0).toFixed(2)}`,
          gst: `${it.gstPercent || 0}%`,
          discount: `-₹${(+it.discount || 0).toFixed(2)}`,
          total: `₹${(+it.totalPrice || 0).toFixed(2)}`
        });
      });
    });

    const tGrand = billsToPrint.reduce((s, b) => s + (+b.finalAmount || 0), 0);
    const tPaid = billsToPrint.reduce((s, b) => s + (+b.receivedAmount || 0), 0);
    const tDue = billsToPrint.reduce((s, b) => s + (+b.totalBalance || 0), 0);
    
    const summary = [
      { label: 'Total Bills', value: billsToPrint.length.toString() },
      { label: 'Grand Total', value: `₹${tGrand.toFixed(2)}` },
      { label: 'Total Paid', value: `₹${tPaid.toFixed(2)}`, color: '#059669' },
      { label: 'Balance Due', value: `₹${tDue.toFixed(2)}`, bold: true, divider: true, color: tDue > 0 ? '#dc2626' : '#059669' }
    ];

    const html = generateA5BillHTML({
      clinicName,
      clinicLogo,
      clinicPhone,
      patientName: record.patientName,
      patientId: record.uhid,
      patientDetails: `${record.patientGender || ''} ${record.patientAge ? `· ${record.patientAge} yrs` : ''}`,
      title: 'INVOICE',
      billNo: billsToPrint.length === 1 ? (billsToPrint[0].billNo || 'N/A') : 'MULTIPLE',
      billDate: new Date().toLocaleDateString('en-IN'),
      status: tDue > 0 ? 'BALANCE DUE' : 'FULLY PAID',
      columns: [
        { key: 'name', label: 'Service Description', align: 'left' },
        { key: 'qty', label: 'Qty', align: 'center', width: '30px' },
        { key: 'price', label: 'Unit Price', align: 'right', width: '60px' },
        { key: 'gst', label: 'GST', align: 'center', width: '40px' },
        { key: 'discount', label: 'Disc.', align: 'right', width: '50px', color: '#dc2626' },
        { key: 'total', label: 'Total', align: 'right', width: '60px', bold: true }
      ],
      items,
      summary,
      payments: [] // Individual bill payments aren't aggregated cleanly here, but can be added if needed
    });

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
      } catch (err) { console.error("Could not save email", err); }
    } else {
      const newEmail = window.prompt("Confirm or change the email address to send the bill:", targetEmail);
      if (!newEmail) return;
      if (newEmail !== targetEmail) {
        targetEmail = newEmail;
        try {
          if (service.update) {
            await service.update(record._id, { patientEmail: targetEmail });
          }
        } catch (err) { console.error("Could not save email", err); }
      }
    }

    const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';
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
    } catch (err) { }

    let items = [];
    billsToPrint.forEach((b, bi) => {
      const isPaid = b.totalBalance <= 0;
      
      items.push({
        name: `BILL #${bi + 1} (${new Date(b.billDate || b.createdAt).toLocaleDateString('en-IN')}) — ${isPaid ? 'PAID' : 'DUE'}`,
        qty: '', price: '', gst: '', discount: '', total: `₹${(+b.finalAmount || 0).toFixed(2)}`,
        bold: true, color: accentColor
      });

      b.items?.forEach(it => {
        items.push({
          name: it.serviceName,
          qty: it.qty,
          price: `₹${(+it.unitPrice || 0).toFixed(2)}`,
          gst: `${it.gstPercent || 0}%`,
          discount: `-₹${(+it.discount || 0).toFixed(2)}`,
          total: `₹${(+it.totalPrice || 0).toFixed(2)}`
        });
      });
    });

    const tGrand = billsToPrint.reduce((s, b) => s + (+b.finalAmount || 0), 0);
    const tPaid = billsToPrint.reduce((s, b) => s + (+b.receivedAmount || 0), 0);
    const tDue = billsToPrint.reduce((s, b) => s + (+b.totalBalance || 0), 0);
    
    const summary = [
      { label: 'Total Bills', value: billsToPrint.length.toString() },
      { label: 'Grand Total', value: `₹${tGrand.toFixed(2)}` },
      { label: 'Total Paid', value: `₹${tPaid.toFixed(2)}`, color: '#059669' },
      { label: 'Balance Due', value: `₹${tDue.toFixed(2)}`, bold: true, divider: true, color: tDue > 0 ? '#dc2626' : '#059669' }
    ];

    const html = generateA5BillHTML({
      clinicName,
      clinicLogo,
      clinicPhone,
      patientName: record.patientName,
      patientId: record.uhid,
      patientDetails: `${record.patientGender || ''} ${record.patientAge ? `· ${record.patientAge} yrs` : ''}`,
      title: 'INVOICE',
      billNo: billsToPrint.length === 1 ? (billsToPrint[0].billNo || 'N/A') : 'MULTIPLE',
      billDate: new Date().toLocaleDateString('en-IN'),
      status: tDue > 0 ? 'BALANCE DUE' : 'FULLY PAID',
      columns: [
        { key: 'name', label: 'Service Description', align: 'left' },
        { key: 'qty', label: 'Qty', align: 'center', width: '30px' },
        { key: 'price', label: 'Unit Price', align: 'right', width: '60px' },
        { key: 'gst', label: 'GST', align: 'center', width: '40px' },
        { key: 'discount', label: 'Disc.', align: 'right', width: '50px', color: '#dc2626' },
        { key: 'total', label: 'Total', align: 'right', width: '60px', bold: true }
      ],
      items,
      summary,
      payments: []
    });

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
  const fmt = (n) => `₹ ${(+n || 0).toFixed(2)}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const modeIcon = (m) => {
    if (m === 'CASH') return <Banknote size={13} />;
    if (m === 'UPI') return <Smartphone size={13} />;
    return <CreditCard size={13} />;
  };

  const totalPaymentsCount = bills.reduce((s, b) => s + (b.payments?.length || 0), 0);
  const grandBalance = bills.reduce((s, b) => s + (b.totalBalance || 0), 0);

  const inpStyle = {
    fontSize: '0.85rem', border: '1.5px solid #e2e8f0',
    borderRadius: 8, padding: '6px 10px', width: '100%', outline: 'none', background: '#fff'
  };

  const TABS = [
    { id: 'addBill', label: 'Add Bill' },
    { id: 'bills', label: `Bills (${bills.length})` },
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
                style={{
                  fontSize: '0.82rem', fontWeight: 600, color: activeTab === t.id ? accentColor : '#64748b',
                  borderBottom: activeTab === t.id ? `3px solid ${accentColor}` : '3px solid transparent',
                  backgroundColor: 'transparent'
                }}
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
                          const up = parseFloat(item.unitPrice) || 0;
                          const q = parseInt(item.qty) || 1;
                          const gst = parseFloat(item.gstPercent) || 0;
                          const disc = parseFloat(item.discount) || 0;
                          const tot = Math.max(0, (up * q - disc) * (1 + gst / 100));
                          return (
                            <tr key={i}>
                              <td className="text-center text-secondary fw-bold">{i + 1}</td>
                              <td>
                                {item.useCustomService ? (
                                  <div className="d-flex align-items-center gap-2">
                                    <input
                                      style={inpStyle}
                                      value={item.serviceName}
                                      placeholder="Custom service name..."
                                      onChange={e => handleServiceNameChange(i, e.target.value)}
                                    />
                                    <button
                                      className="btn btn-sm text-secondary p-1"
                                      onClick={() => {
                                        editItem(i, 'useCustomService', false);
                                        handleServiceNameChange(i, '');
                                      }}
                                      title="Back to list"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    style={inpStyle}
                                    value={availableServices.some(s => s.serviceName === item.serviceName) ? item.serviceName : (item.serviceName ? '__OTHER__' : '')}
                                    onChange={e => {
                                      if (e.target.value === '__OTHER__') {
                                        editItem(i, 'useCustomService', true);
                                        handleServiceNameChange(i, '');
                                      } else {
                                        handleServiceNameChange(i, e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>Select service...</option>
                                    {availableServices.map(s => <option key={s._id} value={s.serviceName}>{s.serviceName}</option>)}
                                    <option value="__OTHER__" className="fw-bold text-primary">+ Add New Custom Service...</option>
                                  </select>
                                )}
                              </td>
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
                      ['Discount', `- ₹ ${computedTotals.totalDiscount.toFixed(2)}`],
                      ['GST / Tax', `₹ ${computedTotals.totalTax.toFixed(2)}`],
                      ['Final Amount', `₹ ${computedTotals.finalAmount.toFixed(2)}`],
                      ['Deposit', `₹ ${(parseFloat(depositAmount) || 0).toFixed(2)}`],
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
                <div className="d-flex justify-content-end mb-3">
                  <button className="btn btn-primary d-flex align-items-center gap-2 rounded-pill fw-bold"
                    onClick={() => setShowMerge(true)}>
                    <Receipt size={18} /> All Bills (Merge & Pay)
                  </button>
                </div>
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
                  const ps = getBillPay(bill._id);
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
                        { label: 'Grand Total', val: bills.reduce((s, b) => s + (+b.finalAmount || 0), 0), color: '#1d4ed8', bg: '#eff6ff' },
                        { label: 'Total Received', val: bills.reduce((s, b) => s + (+b.receivedAmount || 0), 0), color: '#059669', bg: '#f0fdf4' },
                        { label: 'Balance Due', val: grandBalance, color: grandBalance > 0 ? '#dc2626' : '#059669', bg: grandBalance > 0 ? '#fef2f2' : '#f0fdf4' },
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

      {showMerge && (
        <MergeBillModal
          show={true}
          onClose={() => setShowMerge(false)}
          patientId={record.uhid}
          patientName={record.patientName}
        />
      )}
    </div>
  );
};

export default CareRecordBillModal;
