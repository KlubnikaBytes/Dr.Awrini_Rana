import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import frontdeskService from '../../../services/frontdeskService';
import clinicService from '../../../services/clinicService';
import adminService from '../../../services/adminService';
import labCatalogService from '../../../services/labCatalogService';
import { getLocalDateString } from '../../../utils/dateUtils';
import { generateA5BillHTML, getCategoryForItem, getInvoiceTitle } from '../../../utils/printA5Bill';
import PrintBillModal from './PrintBillModal';
import {
  Plus, Trash2, Printer, Share2, CheckCircle, X,
  ChevronDown, Receipt, Tag, Percent, DollarSign, Loader, Edit3
} from 'lucide-react';
import useWebSocket from '../../../hooks/useWebSocket';

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '')) : 'http://localhost:5000';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = n => `₹ ${parseFloat(n || 0).toFixed(2)}`;
const pct = n => `${parseFloat(n || 0)}%`;
const API = `${import.meta.env.VITE_API_URL}/services/`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const EMPTY_ITEM = { serviceName: '', serviceType: 'Other', qty: 1, unitPrice: 0, gstPercent: 0, discount: 0, totalPrice: 0, tieUpOrg: '', performedBy: '' };

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
const generateInvoiceHTML = (bill, patient, clinicLogo, clinicPhone, clinicName, category = 'ALL', categoryBreakdown = {}) => {
  const cn = clinicName || localStorage.getItem('clinicName') || 'Clinic';
  
  const isCategoryFilter = category && category !== 'ALL';
  const targetCategory = isCategoryFilter ? category.trim() : null;

  // Filter items if specific category selected
  const allItems = bill.items || [];
  const itemsToPrint = isCategoryFilter
    ? allItems.filter(item => getCategoryForItem(item).toLowerCase() === targetCategory.toLowerCase())
    : allItems.filter(item => item.serviceName);

  const items = itemsToPrint.map((item, i) => ({
    sn: i + 1,
    name: item.serviceName,
    qty: item.qty,
    price: `₹${parseFloat(item.unitPrice).toFixed(2)}`,
    gst: `${item.gstPercent || 0}%`,
    discount: `-₹${parseFloat(item.discount || 0).toFixed(2)}`,
    total: `₹${parseFloat(item.totalPrice).toFixed(2)}`
  }));

  // Compute category totals
  let billedAmt = 0;
  let discountAmt = 0;
  let gstAmt = 0;
  let finalAmt = 0;
  let receivedAmt = 0;
  let balanceAmt = 0;

  if (!isCategoryFilter) {
    billedAmt = parseFloat(bill.totalBilledAmount || 0);
    discountAmt = parseFloat(bill.totalDiscount || 0);
    gstAmt = parseFloat(bill.totalTax || 0);
    finalAmt = parseFloat(bill.finalAmount || 0);
    receivedAmt = parseFloat(bill.receivedAmount || 0);
    balanceAmt = parseFloat(bill.totalBalance || 0);
  } else {
    billedAmt = itemsToPrint.reduce((acc, it) => acc + (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))), 0);
    discountAmt = itemsToPrint.reduce((acc, it) => acc + parseFloat(it.discount || 0), 0);
    gstAmt = itemsToPrint.reduce((acc, it) => {
      const lp = (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))) - parseFloat(it.discount || 0);
      return acc + (lp * (parseFloat(it.gstPercent || 0) / 100));
    }, 0);
    finalAmt = itemsToPrint.reduce((acc, it) => acc + parseFloat(it.totalPrice || 0), 0);

    const catData = categoryBreakdown[targetCategory];
    if (catData) {
      receivedAmt = catData.received || 0;
      balanceAmt = catData.due !== undefined ? catData.due : Math.max(0, finalAmt - receivedAmt);
    } else {
      receivedAmt = bill.totalBalance <= 0 ? finalAmt : 0;
      balanceAmt = Math.max(0, finalAmt - receivedAmt);
    }
  }

  let title = getInvoiceTitle(category);

  const summary = [
    { label: isCategoryFilter ? `${targetCategory} Billed` : 'Total Billed', value: `₹${billedAmt.toFixed(2)}` },
    ...(discountAmt > 0 ? [{ label: 'Discount', value: `-₹${discountAmt.toFixed(2)}`, color: '#dc2626' }] : []),
    ...(gstAmt > 0 ? [{ label: 'GST', value: `+₹${gstAmt.toFixed(2)}` }] : []),
    { label: isCategoryFilter ? `${targetCategory} Total` : 'Final Amount', value: `₹${finalAmt.toFixed(2)}`, bold: true, divider: true, color: '#1d4ed8' },
    { label: 'Received', value: `₹${receivedAmt.toFixed(2)}`, color: '#059669' },
    { label: 'Balance Due', value: `₹${balanceAmt.toFixed(2)}`, bold: true, divider: true, color: balanceAmt > 0 ? '#dc2626' : '#059669' }
  ];

  // Specific payments for this category
  const payments = (bill.payments || [])
    .filter(p => {
      if (!isCategoryFilter) return true;
      const pSvc = (p.serviceType || '').trim().toLowerCase();
      const pPurp = (p.purpose || '').trim().toLowerCase();
      const normCat = targetCategory.toLowerCase();
      if (pSvc === normCat) return true;
      if (pPurp.includes(normCat)) return true;
      if (normCat === 'consultation' && pPurp.includes('consult')) return true;
      if (normCat === 'day care' && (pPurp.includes('day care') || pPurp.includes('daycare'))) return true;
      if (normCat === 'home care' && (pPurp.includes('home care') || pPurp.includes('homecare'))) return true;
      if (normCat === 'lab' && (pPurp.includes('lab') || pPurp.includes('test'))) return true;
      if (normCat === 'other' && (pSvc === 'other' || pPurp.includes('other'))) return true;
      return false;
    })
    .map(p => ({
      date: new Date(p.paidAt || Date.now()).toLocaleDateString('en-IN'),
      mode: p.paymentMode || 'CASH',
      amount: `₹${parseFloat(p.amount || 0).toFixed(2)}`
    }));

  return generateA5BillHTML({
    clinicName: cn,
    clinicLogo,
    clinicPhone,
    patientName: patient?.name,
    patientId: patient?.patientId,
    patientDetails: `${patient?.gender || ''} ${patient?.age ? `· ${patient.age} yrs` : ''} | Ph: ${patient?.phone || ''}`,
    title,
    billNo: bill.billNo || 'N/A',
    billDate: new Date(bill.billDate || Date.now()).toLocaleDateString('en-IN'),
    status: balanceAmt > 0 ? 'UNPAID' : 'PAID',
    columns: [
      { key: 'sn', label: '#', width: '30px', align: 'center' },
      { key: 'name', label: 'Service Description', align: 'left' },
      { key: 'qty', label: 'Qty', align: 'center', width: '40px' },
      { key: 'price', label: 'Price', align: 'right', width: '70px' },
      { key: 'gst', label: 'GST', align: 'center', width: '50px' },
      { key: 'discount', label: 'Disc.', align: 'right', width: '60px', color: '#dc2626' },
      { key: 'total', label: 'Total', align: 'right', width: '80px', bold: true }
    ],
    items,
    summary,
    payments
  });
};


/* ─── Main Component ───────────────────────────────────────────── */
const AddBillsTab = ({ patient, activeApptId }) => {
  const [services, setServices] = useState([]);
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [billDate, setBillDate] = useState(getLocalDateString());
  const [discType, setDiscType] = useState('none');   // none | percent | flat
  const [discValue, setDiscValue] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payAmt, setPayAmt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payCategory, setPayCategory] = useState('ALL');
  const [printCategory, setPrintCategory] = useState('ALL');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState('edit');   // edit | view
  const [clinicData, setClinicData] = useState(null);
  const [tieUpOrgs, setTieUpOrgs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const printRef = useRef();

  // Derived clinic info for invoice header
  const clinicLogo = clinicData?.logo ? `${API_BASE}/${clinicData.logo.replace(/^\/+/, '')}` : null;
  const clinicPhone = clinicData?.phone || localStorage.getItem('clinicPhone') || '9002535240';
  const clinicName = clinicData?.name || localStorage.getItem('clinicName') || 'Clinic';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [catTrigger, setCatTrigger] = useState(0);
  const [billTrigger, setBillTrigger] = useState(0);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'LABCATALOG_UPDATED' || data.type === 'SERVICE_CATALOG_UPDATED') {
        setCatTrigger(prev => prev + 1);
      } else if (['BILL_UPDATED', 'BILL_CREATED', 'MERGED_BILL_PAYMENT', 'LABORDER_UPDATED', 'DAYCARE_UPDATED', 'HOMECARE_UPDATED'].includes(data.type)) {
        setBillTrigger(prev => prev + 1);
      }
    }
  });

  // Fetch catalogs and services whenever catalog is updated via websocket
  useEffect(() => {
    Promise.all([
      axios.get(API, cfg()).catch(() => ({ data: [] })),
      labCatalogService.getCatalogs().catch(() => []),
      adminService.getTieUpOrgs().catch(() => []),
      adminService.getStaff().catch(() => [])
    ]).then(([svcRes, labData, orgsData, staffData]) => {
      const clinicServices = svcRes.data || [];
      const flatLabServices = [];
      (labData || []).forEach(l => {
        // Main test
        if (l.section) {
          flatLabServices.push({
            _id: l._id,
            serviceName: l.section,
            serviceType: 'Lab',
            price: l.price || 0
          });
        }
        // Sub-tests
        if (l.services && Array.isArray(l.services)) {
          l.services.forEach(s => {
            if (s.name) {
              flatLabServices.push({
                _id: s._id || (l._id + '_' + s.name),
                serviceName: s.name,
                serviceType: 'Lab',
                price: s.price || 0
              });
            }
          });
        }
      });
      setServices([...clinicServices, ...flatLabServices]);
      setTieUpOrgs(orgsData || []);
      setStaffList(staffData || []);
    });
  }, [catTrigger]);

  // Load existing bill when patient changes or when a relevant websocket event occurs in view mode
  useEffect(() => {
    const today = getLocalDateString(); // e.g. "2026-09-17"

    frontdeskService.getBills({ patientId: patient.patientId }).then(bills => {
      let b = null;
      if (bills && bills.length > 0) {
        const apptBill = activeApptId ? bills.find(bill => String(bill.appointment) === String(activeApptId)) : null;
        const todayBill = !activeApptId ? bills.find(bill => {
          const bd = bill.billDate ? getLocalDateString(new Date(bill.billDate)) : null;
          return bd === today;
        }) : null;
        b = apptBill || todayBill || (activeApptId ? null : bills[0]);
      }

      if (b) {
        setBill(b);
        setItems(b.items && b.items.length ? b.items.map(i => ({ ...i })) : [{ ...EMPTY_ITEM }]);
        setBillDate(b.billDate ? getLocalDateString(new Date(b.billDate)) : today);
        setMode('view');
      } else {
        setBill(null);
        setItems([{ ...EMPTY_ITEM }]);
        setMode('edit');
        if (activeApptId) {
          frontdeskService.getAppointments({ patientId: patient.patientId }).then(appts => {
            const currentAppt = appts.find(a => String(a._id) === String(activeApptId));
            if (currentAppt) {
              if (currentAppt.date) {
                setBillDate(getLocalDateString(new Date(currentAppt.date)));
              } else {
                setBillDate(today);
              }

              if (currentAppt.service) {
                const serviceNames = currentAppt.service.split(',').map(s => s.trim()).filter(Boolean);
                const newItems = serviceNames.map(sName => {
                  const matchedService = services.find(s => s.serviceName === sName);
                  if (matchedService) {
                    return {
                      ...EMPTY_ITEM,
                      serviceName: matchedService.serviceName,
                      serviceType: matchedService.type || matchedService.serviceType || currentAppt.serviceType || 'Other',
                      unitPrice: matchedService.price || 0,
                      totalPrice: matchedService.price || 0
                    };
                  } else {
                    return {
                      ...EMPTY_ITEM,
                      serviceName: sName,
                      serviceType: currentAppt.serviceType || 'Other'
                    };
                  }
                });
                setItems(newItems.length > 0 ? newItems : [{ ...EMPTY_ITEM }]);
              } else {
                setItems([{ ...EMPTY_ITEM }]);
              }
            } else {
              setBillDate(today);
              setItems([{ ...EMPTY_ITEM }]);
            }
          }).catch(() => {
            setBillDate(today);
            setItems([{ ...EMPTY_ITEM }]);
          });
        } else {
          setBillDate(today);
          setItems([{ ...EMPTY_ITEM }]);
        }
      }
    }).catch(() => { });
  }, [patient, billTrigger, activeApptId, services]);

  // Fetch clinic data for logo + phone in invoice header (only once)
  useEffect(() => {
    clinicService.getAllClinics().then(clinics => {
      const storedId = localStorage.getItem('clinicId');
      const storedName = localStorage.getItem('clinicName') || '';
      const match = clinics.find(c => c._id === storedId || c.name?.toLowerCase() === storedName.toLowerCase()) || clinics[0];
      if (match) setClinicData(match);
    }).catch(() => { });
  }, []);


  // Live totals
  const totals = useMemo(() => {
    let billed = 0, disc = 0, tax = 0;
    items.forEach(it => {
      const lp = (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1);
      const d = parseFloat(it.discount) || 0;
      const t = parseFloat(it.gstPercent) || 0;
      const taxAmt = parseFloat(((lp - d) * t / 100).toFixed(2));
      billed += lp;
      disc += d;
      tax += taxAmt;
    });
    let extraDisc = 0;
    if (discType === 'percent') extraDisc = parseFloat(((billed - disc) * parseFloat(discValue || 0) / 100).toFixed(2));
    else if (discType === 'flat') extraDisc = parseFloat(discValue || 0);

    if (discType === 'none' && bill && bill.totalDiscount > disc) {
      extraDisc = bill.totalDiscount - disc;
    }

    disc += extraDisc;
    const final = Math.max(0, billed - disc + tax);
    const received = bill?.receivedAmount || 0;
    const balance = Math.max(0, final - received);
    return { billed, disc, tax, final, received, balance };
  }, [items, discType, discValue, bill]);


  const categoryBreakdown = useMemo(() => {
    const currentItems = (bill?.items && bill.items.length > 0) ? bill.items : items;
    const map = {};

    currentItems.forEach(it => {
      if (!it.serviceName) return;
      const cat = getCategoryForItem(it);
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          billed: 0,
          received: 0,
          due: 0
        };
      }
      const lp = (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1);
      const d = parseFloat(it.discount) || 0;
      const t = parseFloat(it.gstPercent) || 0;
      const lineTotal = it.totalPrice !== undefined ? Number(it.totalPrice) : parseFloat((lp - d + (lp - d) * t / 100).toFixed(2));
      map[cat].billed += lineTotal;
    });

    const bFinal = bill?.finalAmount !== undefined ? bill.finalAmount : totals.final;
    const bRec = bill?.receivedAmount || 0;
    const bBal = bill?.totalBalance !== undefined ? bill.totalBalance : totals.balance;

    if (bBal <= 0 || (bFinal > 0 && bRec >= bFinal)) {
      Object.values(map).forEach(c => {
        c.received = c.billed;
        c.due = 0;
      });
    } else {
      let unassignedPaid = 0;
      (bill?.payments || []).forEach(p => {
        const pAmt = Number(p.amount) || 0;
        const pSvc = (p.serviceType || '').trim().toLowerCase();
        const pPurp = (p.purpose || '').trim().toLowerCase();

        let matchedCat = null;
        if (pSvc === 'consultation' || (!pSvc && pPurp.includes('consult'))) matchedCat = 'Consultation';
        else if (pSvc === 'lab' || (!pSvc && (pPurp.includes('lab') || pPurp.includes('test')))) matchedCat = 'Lab';
        else if (pSvc === 'day care' || pSvc === 'daycare' || (!pSvc && (pPurp.includes('day care') || pPurp.includes('daycare')))) matchedCat = 'Day Care';
        else if (pSvc === 'home care' || pSvc === 'homecare' || (!pSvc && (pPurp.includes('home care') || pPurp.includes('homecare')))) matchedCat = 'Home Care';
        else if (pSvc === 'other') matchedCat = 'Other';

        if (matchedCat && map[matchedCat]) {
          map[matchedCat].received += pAmt;
        } else {
          unassignedPaid += pAmt;
        }
      });

      if (unassignedPaid > 0) {
        const cats = Object.values(map);
        const totalRemDue = cats.reduce((sum, c) => sum + Math.max(0, c.billed - c.received), 0);
        if (totalRemDue > 0) {
          cats.forEach(c => {
            const curDue = Math.max(0, c.billed - c.received);
            c.received += Math.min(curDue, unassignedPaid * (curDue / totalRemDue));
          });
        }
      }

      Object.values(map).forEach(c => {
        c.received = Math.min(c.billed, parseFloat(c.received.toFixed(2)));
        c.due = Math.max(0, parseFloat((c.billed - c.received).toFixed(2)));
      });
    }

    return map;
  }, [items, bill, totals]);

  const selectedMaxDue = useMemo(() => {
    if (payCategory === 'ALL') {
      return totals.balance;
    }
    const cat = categoryBreakdown[payCategory];
    return cat ? cat.due : totals.balance;
  }, [payCategory, categoryBreakdown, totals.balance]);

  const handleCategoryChange = (newCat) => {
    setPayCategory(newCat);
    if (newCat === 'ALL') {
      setPayNote('');
      setPayAmt(totals.balance > 0 ? totals.balance.toFixed(2) : '');
    } else {
      const catDue = categoryBreakdown[newCat]?.due || 0;
      setPayNote(`${newCat} fee`);
      setPayAmt(catDue > 0 ? catDue.toFixed(2) : '');
    }
  };

  const handleAmountChange = (val) => {
    if (val === '') {
      setPayAmt('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setPayAmt('');
      return;
    }
    if (num > selectedMaxDue) {
      setPayAmt(selectedMaxDue.toFixed(2));
      showToast(`Amount capped at ${payCategory === 'ALL' ? 'total balance' : payCategory + ' due'} (₹${selectedMaxDue.toFixed(2)})`, 'error');
    } else {
      setPayAmt(val);
    }
  };

  // Update line item field
  const setField = (idx, key, val) => {
    setItems(its => {
      const n = [...its];
      n[idx] = { ...n[idx], [key]: val };
      // Recompute totalPrice
      const it = n[idx];
      const lp = (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1);
      const d = parseFloat(it.discount) || 0;
      const t = parseFloat(it.gstPercent) || 0;
      n[idx].totalPrice = parseFloat((lp - d + (lp - d) * t / 100).toFixed(2));
      return n;
    });
  };

  const selectService = (idx, svc) => {
    setItems(its => {
      const n = [...its];
      n[idx] = { ...n[idx], serviceName: svc.serviceName, serviceType: svc.type || svc.serviceType || 'Other', unitPrice: svc.price || 0, discount: 0 };
      const lp = (svc.price || 0) * (parseInt(n[idx].qty) || 1);
      n[idx].totalPrice = lp;
      return n;
    });
  };

  const addRow = () => setItems(its => [...its, { ...EMPTY_ITEM }]);
  const removeRow = idx => setItems(its => its.filter((_, i) => i !== idx));

  const handleAddNewTieUpOrg = async (idx) => {
    const orgName = window.prompt("Enter new Tie-Up Organization Name:");
    if (!orgName || !orgName.trim()) return;
    try {
      await adminService.addTieUpOrg({ name: orgName.trim(), clinicId: clinicData?._id });
      const updated = await adminService.getTieUpOrgs();
      setTieUpOrgs(updated);
      setField(idx, 'tieUpOrg', orgName.trim());
      showToast('Tie-Up Organization added successfully');
    } catch (e) {
      showToast('Error adding Tie-Up Organization', 'error');
    }
  };

  const handleAddNewStaff = async (idx) => {
    const staffName = window.prompt("Enter new Staff Name:");
    if (!staffName || !staffName.trim()) return;
    try {
      const ts = Date.now();
      const dummyStaff = {
        name: staffName.trim(),
        role: 'Staff',
        gender: 'Other',
        email: `staff_${ts}@example.com`,
        phone: '0000000000',
        password: 'password123'
      };
      await adminService.addStaff(dummyStaff);
      const updated = await adminService.getStaff();
      setStaffList(updated);
      setField(idx, 'performedBy', staffName.trim());
      showToast('Staff added successfully');
    } catch (e) {
      showToast('Error adding Staff', 'error');
    }
  };

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
        appointmentId: activeApptId
      };
      let saved;
      if (bill) saved = await frontdeskService.updateBill(bill._id, payload);
      else saved = await frontdeskService.createBill(payload);
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
    const amountToPay = payAmt ? parseFloat(payAmt) : selectedMaxDue;
    if (amountToPay <= 0) return showToast('No balance due to pay for this selection', 'error');
    if (amountToPay > selectedMaxDue) {
      return showToast(`Cannot collect more than ${payCategory === 'ALL' ? 'total' : payCategory} due (₹${selectedMaxDue.toFixed(2)})`, 'error');
    }
    setPaying(true);
    try {
      const updated = await frontdeskService.payBill(bill._id, {
        amount: amountToPay,
        paymentMode: payMode,
        purpose: payNote || (payCategory === 'ALL' ? 'Payment' : `${payCategory} fee`),
        serviceType: payCategory === 'ALL' ? '' : payCategory
      });
      setBill(updated);
      setPayAmt('');
      setPayNote('');
      setBillTrigger(prev => prev + 1);
      showToast('Payment recorded!');
    } catch (e) { showToast('Payment failed', 'error'); }
    finally { setPaying(false); }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      const res = await frontdeskService.deletePayment(bill._id, paymentId);
      setBill(res.bill);
      setBillTrigger(prev => prev + 1);
      showToast('Payment deleted!');
    } catch (e) {
      showToast('Failed to delete payment', 'error');
    }
  };

  const handlePrint = (categoryToPrint = null) => {
    // If an explicit category is passed (e.g. from modal or dropdown chip), print that directly
    if (categoryToPrint) {
      setPrintCategory(categoryToPrint);
      doPrint(categoryToPrint);
      return;
    }

    // If printCategory is set to a specific category other than 'ALL', print that directly
    if (printCategory !== 'ALL') {
      doPrint(printCategory);
      return;
    }

    // If 'ALL' is selected and multiple categories exist in this bill, open selection modal
    const availableCategories = Object.keys(categoryBreakdown);
    if (availableCategories.length > 1) {
      setShowPrintModal(true);
      return;
    }

    // Single category or no items -> print directly
    doPrint('ALL');
  };

  const doPrint = (cat = 'ALL') => {
    const currentItems = (bill?.items && bill.items.length > 0) ? bill.items : items;

    // Build bill data from live state (works even before saving)
    const printData = bill
      ? { ...bill, items: currentItems, totalBilledAmount: totals.billed, totalDiscount: totals.disc, totalTax: totals.tax, finalAmount: totals.final, totalBalance: totals.balance }
      : { items: currentItems, billDate, totalBilledAmount: totals.billed, totalDiscount: totals.disc, totalTax: totals.tax, finalAmount: totals.final, totalBalance: totals.balance, receivedAmount: 0 };

    const html = generateInvoiceHTML(printData, patient, clinicLogo, clinicPhone, clinicName, cat, categoryBreakdown);

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
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { }
    }, 600);
  };

  const handleShare = async (categoryToShare = printCategory) => {
    const cat = categoryToShare || printCategory || 'ALL';
    const isCat = cat && cat !== 'ALL';
    const currentItems = (bill?.items && bill.items.length > 0) ? bill.items : items;
    const shareItems = isCat
      ? currentItems.filter(i => i.serviceName && getCategoryForItem(i).toLowerCase() === cat.toLowerCase())
      : currentItems.filter(i => i.serviceName);

    const catBilled = shareItems.reduce((acc, it) => acc + (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))), 0);
    const catFinal = shareItems.reduce((acc, it) => acc + parseFloat(it.totalPrice || 0), 0);
    const catData = categoryBreakdown[cat];
    const catDue = catData ? catData.due : (bill ? bill.totalBalance : totals.balance);

    const lines = [
      `${isCat ? cat.toUpperCase() + ' ' : ''}BILL — Dr. Aswini Rana Clinic`,
      `Patient: ${patient.name} (${patient.patientId})`,
      `Date: ${new Date(billDate).toLocaleDateString('en-IN')}`,
      ``,
      ...shareItems.map((i, idx) => `${idx + 1}. ${i.serviceName} x${i.qty} = ₹${parseFloat(i.totalPrice || 0).toFixed(2)}`),
      ``,
      `Total: ₹${(isCat ? catBilled : totals.billed).toFixed(2)}`,
      `Final: ₹${(isCat ? catFinal : totals.final).toFixed(2)}`,
      `Balance Due: ₹${(isCat ? catDue : totals.balance).toFixed(2)}`,
    ].join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Bill', text: lines }); return; } catch (e) { }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(lines);
      showToast('Bill summary copied to clipboard!');
    } catch (e) { showToast('Could not share bill', 'error'); }
  };

  const isUnpaid = totals.balance > 0;
  const b = bill;

  return (
    <div className="d-flex h-100 overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>

      {/* Toast */}
      {toast && (
        <div className="position-fixed top-0 end-0 m-3 alert shadow-lg d-flex align-items-center gap-2 py-2 px-3"
          style={{ zIndex: 9999, borderRadius: 12, backgroundColor: toast.type === 'success' ? '#d1fae5' : '#fee2e2', border: `1.5px solid ${toast.type === 'success' ? '#6ee7b7' : '#fca5a5'}`, color: toast.type === 'success' ? '#065f46' : '#7f1d1d', fontSize: '0.88rem', fontWeight: 600 }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <X size={16} />} {toast.msg}
        </div>
      )}

      {/* ── Left Panel: Bill Items ── */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ minWidth: 0 }}>

        {/* Bill header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 bg-white" style={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, backgroundColor: '#eff6ff' }}>
              <Receipt size={18} style={{ color: '#2563eb' }} />
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
                value={billDate} onChange={e => setBillDate(e.target.value)} disabled={mode === 'view'} />
              <button className="btn btn-sm rounded-pill px-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.75rem' }}
                onClick={() => setBillDate(getLocalDateString())}>Today</button>
            </div>

            {/* Status badge */}
            {b && (
              <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: isUnpaid ? '#fee2e2' : '#d1fae5', color: isUnpaid ? '#dc2626' : '#059669', fontWeight: 700, fontSize: '0.75rem' }}>
                {isUnpaid ? `Due ₹${totals.balance.toFixed(2)}` : '✓ Paid'}
              </span>
            )}

            {mode === 'view'
              ? <button className="btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3 fw-semibold" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.8rem' }} onClick={() => setMode('edit')}>
                <Edit3 size={13} /> Edit Bill
              </button>
              : <button className="btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3 fw-bold" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontSize: '0.82rem' }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : '💾 Save Bill'}
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
                <th className="text-secondary fw-semibold py-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 140 }}>Assignment</th>
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
                  <td className="py-2 align-middle">
                    {mode === 'edit' && item.serviceType === 'Lab' && (
                      <select className="form-select form-select-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem' }}
                        value={item.tieUpOrg || ''} onChange={e => {
                          if (e.target.value === 'ADD_NEW') handleAddNewTieUpOrg(idx);
                          else setField(idx, 'tieUpOrg', e.target.value);
                        }}>
                        <option value="">— Own (ASR) —</option>
                        {tieUpOrgs.map(o => <option key={o._id} value={o.name}>{o.name}</option>)}
                        <option value="ADD_NEW">+ Add New</option>
                      </select>
                    )}
                    {mode === 'edit' && (item.serviceType === 'Day Care' || item.serviceType === 'Home Care') && (
                      <select className="form-select form-select-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem' }}
                        value={item.performedBy || ''} onChange={e => {
                          if (e.target.value === 'ADD_NEW') handleAddNewStaff(idx);
                          else setField(idx, 'performedBy', e.target.value);
                        }}>
                        <option value="">— Unassigned —</option>
                        {staffList.map(s => <option key={s._id} value={s.name}>{s.name} ({s.role})</option>)}
                        <option value="ADD_NEW">+ Add New</option>
                      </select>
                    )}
                    {mode === 'view' && (
                      <span className="small text-secondary fw-semibold">
                        {item.serviceType === 'Lab' && item.tieUpOrg ? item.tieUpOrg : ''}
                        {(item.serviceType === 'Day Care' || item.serviceType === 'Home Care') && item.performedBy ? item.performedBy : ''}
                      </span>
                    )}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={1} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, width: 60 }}
                        value={item.qty} onChange={e => setField(idx, 'qty', e.target.value)} />
                    ) : <span>{item.qty}</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6 }}
                        value={item.unitPrice} onChange={e => setField(idx, 'unitPrice', e.target.value)} />
                    ) : <span>₹{parseFloat(item.unitPrice).toFixed(2)}</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} max={100} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6, width: 64 }}
                        value={item.gstPercent} onChange={e => setField(idx, 'gstPercent', e.target.value)} />
                    ) : <span>{item.gstPercent}%</span>}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' ? (
                      <input type="number" min={0} className="form-control form-control-sm text-center shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 6 }}
                        value={item.discount} onChange={e => setField(idx, 'discount', e.target.value)} />
                    ) : <span className="text-danger">-₹{parseFloat(item.discount).toFixed(2)}</span>}
                  </td>
                  <td className="py-2 align-middle fw-bold text-end" style={{ color: '#1d4ed8' }}>
                    ₹{parseFloat(item.totalPrice || 0).toFixed(2)}
                  </td>
                  <td className="py-2 align-middle text-center">
                    {mode === 'edit' && items.length > 1 && (
                      <button className="btn btn-sm p-1 text-danger border-0 bg-transparent" onClick={() => removeRow(idx)}>
                        <Trash2 size={14} />
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
                <Plus size={14} /> Add Service
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
                    placeholder={discType === 'percent' ? 'e.g. 10' : 'e.g. 100'} value={discValue} onChange={e => setDiscValue(e.target.value)} />
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
            <Receipt size={15} style={{ color: '#2563eb' }} /> Bill Summary
          </div>

          {[
            { label: 'Total Billed', value: totals.billed, color: '#1e293b' },
            { label: 'Discount', value: `-${totals.disc.toFixed(2)}`, color: '#dc2626', prefix: '₹' },
            { label: 'Tax (GST)', value: `+${totals.tax.toFixed(2)}`, color: '#059669', prefix: '₹' },
          ].map(r => (
            <div key={r.label} className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.82rem' }}>
              <span className="text-secondary">{r.label}</span>
              <span className="fw-semibold" style={{ color: r.color }}>
                {r.prefix || '₹'} {typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
              </span>
            </div>
          ))}

          <div className="d-flex justify-content-between align-items-center pt-2 border-top mb-2">
            <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>Final Amount</span>
            <span className="fw-black" style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>₹ {totals.final.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.82rem' }}>
            <span className="text-secondary">Total Received</span>
            <span className="fw-semibold text-success">₹ {(b?.receivedAmount || 0).toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center rounded-3 p-2 mt-2" style={{ backgroundColor: isUnpaid ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isUnpaid ? '#fecaca' : '#bbf7d0'}` }}>
            <span className="fw-bold" style={{ color: isUnpaid ? '#dc2626' : '#059669', fontSize: '0.85rem' }}>Balance Due</span>
            <span className="fw-black" style={{ color: isUnpaid ? '#dc2626' : '#059669', fontSize: '1rem' }}>₹ {totals.balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment History */}
        {b?.payments?.length > 0 && (
          <div className="p-3 border-bottom">
            <div className="fw-semibold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }}>
              <CheckCircle size={13} style={{ color: '#059669' }} /> Payment History
            </div>
            <div className="d-flex flex-column gap-2">
              {b.payments.map((p, i) => (
                <div key={i} className="d-flex align-items-start justify-content-between rounded-2 px-2 py-2" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.8rem', color: '#059669' }}>₹ {parseFloat(p.amount).toFixed(2)}</div>
                    <div className="text-secondary d-flex align-items-center gap-1 flex-wrap" style={{ fontSize: '0.7rem' }}>
                      <span>{p.paymentMode}</span>
                      <span>·</span>
                      <span>{p.purpose || 'Payment'}</span>
                      {p.serviceType && (
                        <span className="badge rounded-pill bg-light text-primary border" style={{ fontSize: '0.62rem' }}>
                          {p.serviceType}
                        </span>
                      )}
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.68rem' }}>{new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className="d-flex flex-column align-items-end gap-1">
                    <span className="badge rounded-pill" style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.65rem' }}>PAID</span>
                    <button className="btn btn-sm p-1 text-danger border-0 bg-transparent" onClick={() => handleDeletePayment(p._id)} title="Delete Payment">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record Payment */}
        <div className="p-3 border-bottom">
          <div className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
            <DollarSign size={14} style={{ color: '#059669' }} />
            {b?.payments?.length > 0 ? 'Add Another Payment' : 'Record Payment'}
          </div>

          {!bill && (
            <div className="p-2 rounded-3 mb-3 text-center" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', fontSize: '0.75rem', color: '#c2410c' }}>
              Save the bill first to record payment
            </div>
          )}

          {/* Service / Department Dropdown */}
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Service / Department</label>
            <select
              className="form-select form-select-sm shadow-none"
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}
              value={payCategory}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="ALL">All Services / Entire Bill (Due: ₹{totals.balance.toFixed(2)})</option>
              {Object.values(categoryBreakdown).map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} (Due: ₹{cat.due.toFixed(2)}{cat.due <= 0 ? ' - PAID' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Purpose */}
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Purpose</label>
            <input className="form-control form-control-sm shadow-none" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
              placeholder="e.g. Consultation fee, Lab charges..." value={payNote} onChange={e => setPayNote(e.target.value)} />
          </div>

          {/* Payment Mode */}
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Payment Mode</label>
            <div className="d-flex gap-1 flex-wrap">
              {['CASH', 'UPI', 'CARD'].map(m => (
                <button key={m} className="btn btn-sm rounded-pill px-2" style={{
                  fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: payMode === m ? '#059669' : 'transparent', color: payMode === m ? '#fff' : '#64748b',
                  border: payMode === m ? '1.5px solid #059669' : '1.5px solid #e2e8f0', padding: '3px 10px'
                }}
                  onClick={() => setPayMode(m)}>{m}</button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label small fw-semibold text-secondary mb-0" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
              <span className="small text-muted" style={{ fontSize: '0.7rem' }}>
                Max Due: <strong style={{ color: selectedMaxDue > 0 ? '#dc2626' : '#059669' }}>₹{selectedMaxDue.toFixed(2)}</strong>
              </span>
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text" style={{ border: '1.5px solid #e2e8f0', borderRight: 'none', backgroundColor: '#f8fafc' }}>₹</span>
              <input type="number" min={0} max={selectedMaxDue} className="form-control shadow-none" style={{ border: '1.5px solid #e2e8f0', borderLeft: 'none' }}
                placeholder={selectedMaxDue > 0 ? selectedMaxDue.toFixed(2) : '0.00'} value={payAmt} onChange={e => handleAmountChange(e.target.value)} />
              <button className="btn btn-sm" style={{ border: '1.5px solid #e2e8f0', borderLeft: 'none', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.72rem' }}
                onClick={() => setPayAmt(selectedMaxDue.toFixed(2))}>Full</button>
            </div>
          </div>

          <button className="btn w-100 fw-bold rounded-pill" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', color: '#fff', border: 'none', fontSize: '0.85rem', padding: '9px' }}
            onClick={handlePay} disabled={paying || !bill || selectedMaxDue <= 0}>
            {paying
              ? <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
              : <>{b?.payments?.length > 0 ? '+ Add Payment' : '💳 Pay'} ₹ {parseFloat(payAmt || selectedMaxDue).toFixed(2)}</>}
          </button>
        </div>

        {/* Print / Share Options */}
        <div className="p-3 border-top bg-white">
          <div className="mb-2">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label small fw-semibold text-secondary mb-0" style={{ fontSize: '0.75rem' }}>
                Print Option:
              </label>
              <div className="d-flex align-items-center gap-1">
                {Object.keys(categoryBreakdown).length > 1 && (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none"
                    style={{ fontSize: '0.69rem', color: '#2563eb', fontWeight: 600 }}
                    onClick={() => setShowPrintModal(true)}
                  >
                    Select in Modal →
                  </button>
                )}
                <span className="badge rounded-pill" style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.68rem', fontWeight: 600 }}>
                  {printCategory === 'ALL' ? 'Entire Bill' : printCategory}
                </span>
              </div>
            </div>
            <select
              className="form-select form-select-sm shadow-none"
              style={{ border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}
              value={printCategory}
              onChange={e => setPrintCategory(e.target.value)}
            >
              <option value="ALL">All Services / Entire Bill (₹{totals.final.toFixed(2)})</option>
              {Object.values(categoryBreakdown).map(c => (
                <option key={c.name} value={c.name}>
                  Only {c.name} (₹{c.billed.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Chips (if multiple categories exist) */}
          {Object.keys(categoryBreakdown).length > 1 && (
            <div className="d-flex gap-1 flex-wrap mb-2">
              <button
                type="button"
                className="btn btn-sm rounded-pill px-2 py-0"
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  backgroundColor: printCategory === 'ALL' ? '#2563eb' : '#f1f5f9',
                  color: printCategory === 'ALL' ? '#fff' : '#64748b',
                  border: 'none',
                  height: 22
                }}
                onClick={() => setPrintCategory('ALL')}
              >
                All
              </button>
              {Object.values(categoryBreakdown).map(c => (
                <button
                  key={c.name}
                  type="button"
                  className="btn btn-sm rounded-pill px-2 py-0"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    backgroundColor: printCategory === c.name ? '#2563eb' : '#f1f5f9',
                    color: printCategory === c.name ? '#fff' : '#64748b',
                    border: 'none',
                    height: 22
                  }}
                  onClick={() => setPrintCategory(c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              className="btn flex-grow-1 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-semibold shadow-sm"
              style={{ border: '1.5px solid #2563eb', color: '#2563eb', fontSize: '0.8rem', backgroundColor: '#eff6ff' }}
              onClick={() => handlePrint()}
              title={`Print ${printCategory === 'ALL' ? 'Entire Bill' : printCategory}`}
            >
              <Printer size={14} /> Print {printCategory === 'ALL' ? 'Invoice' : printCategory}
            </button>
            <button
              className="btn flex-grow-1 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-semibold shadow-sm"
              style={{ border: '1.5px solid #059669', color: '#059669', fontSize: '0.8rem', backgroundColor: '#f0fdf4' }}
              onClick={() => handleShare(printCategory)}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Print Category Modal */}
      <PrintBillModal
        show={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onPrint={(cat) => {
          setPrintCategory(cat);
          doPrint(cat);
        }}
        patient={patient}
        bill={bill}
        items={items}
        totals={totals}
        categoryBreakdown={categoryBreakdown}
      />
    </div>
  );
};

export default AddBillsTab;
