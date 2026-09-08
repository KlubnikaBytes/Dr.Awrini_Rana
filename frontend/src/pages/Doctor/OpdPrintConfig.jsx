import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Edit3, ChevronDown, Upload, X, RefreshCw,
  Printer, FileText, Save, Loader2, CheckCircle, Plus, Trash2, Phone
} from 'lucide-react';
import printConfigService from '../../services/printConfigService';
import adminService from '../../services/adminService';
import clinicService from '../../services/clinicService';
import moment from 'moment';

/* ─── Defaults ───────────────────────────────────────────────────────────── */
const DEFAULT_CONFIG = {
  templateName: 'Default Print Template',
  printMarginLeft: 50, printMarginRight: 50,
  printMarginHeaderHeight: 275, printMarginFooterHeight: 60, printMarginPageHeight: 1300,
  whatsappMarginLeft: 50, whatsappMarginRight: 50,
  whatsappMarginHeaderHeight: 275, whatsappMarginFooterHeight: 60,
  formsMarginLeft: 15, formsMarginRight: 15,
  formsMarginHeaderHeight: 75, formsMarginFooterHeight: 50,
  fontFamily: 'Times', fontSize: 12, fontSizeCompensation: 2,
  patientImageHeight: 80, patientImageWidth: 150,
  headerImage: null, footerImage: null,
  useOwnLetterhead: false, printHeaderFirstPageOnly: true,
  printSignatureImage: false, signatureHeightCm: 45,
  printSignatureText: true, signatureText: '',
  printGenericName: true, tabularPrint: false,
  showPatientPhone: false, showPatientAddress: true,
  showReferredBy: false, showChannelThrough: false,
  showDepartment: false, showDoctorName: false,
  showVisitNumber: false, showPrintTime: false,
  showValidTill: false, showAbhaNumber: false,
  patientDetailFormat: 'single', capitalizePatientName: true,
  showPrintPreview: true, enableLanguageTranslation: true,
  enableBackgroundGraphics: false, enableMedicineDetails: false, printQRCode: false,
  defaultPrintLanguage: 'English', isDefault: true,
};

const FONT_FAMILIES = ['Times', 'Arial', 'Helvetica', 'Courier', 'Georgia', 'Verdana'];
const FONT_SIZES    = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20];
const LANGUAGES     = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Punjabi'];

const API_BASE = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin)
  : 'http://localhost:5000';

/* ─── Toggle switch ──────────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange, id }) => (
  <div
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
      background: checked ? '#2563eb' : '#d1d5db', transition: 'background 0.2s', flexShrink: 0
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 3, left: checked ? 23 : 3,
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
    }} />
  </div>
);

/* ─── Margin row ─────────────────────────────────────────────────────────── */
const MarginRow = ({ label, note, fields, cfg, set }) => (
  <div className="mb-3">
    <div className="fw-semibold mb-1" style={{ fontSize: '0.88rem' }}>{label}</div>
    {note && <div className="text-muted mb-2" style={{ fontSize: '0.78rem' }}>{note}</div>}
    <div className="d-flex flex-wrap gap-3">
      {fields.map(f => (
        <div key={f.key} style={{ minWidth: 70 }}>
          <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: f.colored ? '#2563eb' : '#374151', fontWeight: f.colored ? 600 : 400 }}>{f.label}</label>
          <input type="number" className="form-control form-control-sm" style={{ width: 80 }}
            value={cfg[f.key] ?? ''} onChange={e => set(p => ({ ...p, [f.key]: Number(e.target.value) }))} />
        </div>
      ))}
    </div>
  </div>
);

const SectionTitle = ({ title }) => (
  <div className="fw-bold mb-3" style={{ fontSize: '0.95rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
    {title}
  </div>
);

/* ─── Image upload box ───────────────────────────────────────────────────── */
const ImageUploadBox = ({ label, value, onUpload, onClear, uploading }) => {
  const ref = useRef();
  return (
    <div className="mb-3">
      <div className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>{label}</div>
      <div
        style={{
          border: '1.5px dashed #94a3b8', borderRadius: 8, minHeight: 90,
          background: value ? '#fff' : 'repeating-conic-gradient(#e5e7eb 0% 25%,#f9fafb 0% 50%) 0 0/16px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', cursor: value ? 'default' : 'pointer'
        }}
        onClick={() => !value && ref.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt={label} style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
            <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
              style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', border: 'none', borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
              {uploading ? <Loader2 size={12} className="spin" /> : <X size={12} />} Clear
            </button>
          </>
        ) : (
          <div className="text-center text-muted p-3">
            {uploading ? <Loader2 size={20} className="spin" /> : <Upload size={20} />}
            <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Click to upload</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = ''; }} />
      {!value && (
        <button type="button" className="btn btn-outline-secondary btn-sm mt-1" style={{ fontSize: '0.75rem' }} onClick={() => ref.current?.click()}>
          <Upload size={12} className="me-1" /> Choose File
        </button>
      )}
    </div>
  );
};

/* ─── Live preview panel ─────────────────────────────────────────────────── */
const PrintPreview = ({ cfg, doctor, clinic }) => {
  const rawName    = (doctor?.name || '').replace(/^dr\.?\s*/i, '').trim();
  const doctorName = rawName ? `DR. ${rawName.toUpperCase()}` : 'DR. DOCTOR NAME';
  const qualifs    = doctor?.qualifications || '';
  const speciality = doctor?.speciality || '';
  const bio        = doctor?.bio || '';
  const regNo      = doctor?.registrationNo || '';
  const docPhone   = doctor?.contactForPrescription || doctor?.phone || '';
  const clinicPhone= clinic?.phone || docPhone || '';
  const sig        = doctor?.signatureImage || '';
  const sigName    = cfg.signatureText || (rawName ? `Dr. ${rawName}` : 'Dr. Doctor');
  const rawLogoPath = clinic?.logo || null;
  const clinicLogo  = rawLogoPath ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` : null;
  const clinicName  = clinic?.name || localStorage.getItem('clinicName') || 'Clinic';

  return (
    <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', overflow: 'hidden', width: '100%', position: 'relative', userSelect: 'none' }}>
      {/* Watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ transform: 'rotate(-30deg)', color: 'rgba(0,0,0,0.06)', fontSize: '2.2rem', fontWeight: 900, letterSpacing: 4, whiteSpace: 'nowrap' }}>Print Preview</div>
      </div>

      {/* Header */}
      {cfg.headerImage && !cfg.useOwnLetterhead ? (
        <img src={cfg.headerImage} alt="Header" style={{ width: '100%', maxHeight: 100, objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ padding: '10px 14px 6px', fontFamily: cfg.fontFamily }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#0056b3', fontWeight: 800, fontSize: '1rem', letterSpacing: 0.5 }}>{doctorName}</div>
              <div style={{ color: '#00a8cc', fontSize: '0.65rem', lineHeight: 1.4, fontWeight: 600, marginTop: 2 }}>
                {qualifs && <div>{qualifs}</div>}
                {speciality && <div>{speciality}</div>}
                {bio && <div>{bio}</div>}
                {regNo && <div>{regNo}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {clinicLogo ? (
                <img src={clinicLogo} alt={clinicName} style={{ maxHeight: 44, maxWidth: 80, objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '1rem', fontWeight: 900, fontStyle: 'italic', color: '#0056b3' }}>{clinicName}</div>
              )}
              {clinicPhone && <div style={{ color: '#0056b3', fontSize: '0.65rem', fontWeight: 700 }}>📞 {clinicPhone}</div>}
            </div>
          </div>
        </div>
      )}
      <div style={{ borderBottom: '2px dashed #dc2626', margin: '0 14px' }} />
      <div style={{ padding: '3px 14px', background: '#fff5f5', fontSize: '0.65rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
        <span>CC 54321 : Mr. John Doe (29y, Male)</span>
        <span>Date : {moment().format('DD MMM YYYY')}</span>
      </div>

      {/* Body */}
      <div style={{ minHeight: 200, padding: '10px 14px', fontFamily: cfg.fontFamily, fontSize: cfg.fontSize + 'px' }}>
        <div style={{ color: '#cbd5e1', fontSize: '0.68rem', textAlign: 'center', marginTop: 50 }}>Prescription content will appear here</div>
      </div>

      {/* Signature */}
      <div style={{ padding: '6px 14px', textAlign: 'right' }}>
        {cfg.printSignatureImage && sig ? (
          <img src={sig} alt="sig" style={{ height: `${cfg.signatureHeightCm * 0.35}px`, maxWidth: 100, objectFit: 'contain', display: 'block', marginLeft: 'auto' }} />
        ) : (
          <div style={{ height: 18, width: 80, borderBottom: '1.5px solid #333', marginLeft: 'auto', marginBottom: 2 }} />
        )}
        {cfg.printSignatureText && <div style={{ fontSize: '0.68rem', fontWeight: 600 }}>{sigName}</div>}
      </div>

      {/* Footer */}
      {cfg.footerImage ? (
        <img src={cfg.footerImage} alt="Footer" style={{ width: '100%', maxHeight: 50, objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '4px 14px', fontSize: '0.58rem', color: '#64748b', textAlign: 'center' }}>
          Footer area • DOCTOR CONSULTATION : DAY CARE : HOME CARE
        </div>
      )}
    </div>
  );
};

/* ─── Template dropdown ──────────────────────────────────────────────────── */
const TemplateDropdown = ({ templates, activeId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const active = templates.find(t => t._id === activeId);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', cursor: 'pointer', minWidth: 200, userSelect: 'none' }}
      >
        <span style={{ flex: 1 }}>{active?.templateName || 'Select Template'}</span>
        {active?.isDefault && <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Default</span>}
        <ChevronDown size={14} style={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
          {templates.map(t => (
            <div
              key={t._id}
              onClick={() => { onSelect(t._id); setOpen(false); }}
              style={{
                padding: '9px 14px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: t._id === activeId ? '#eff6ff' : '#fff',
                fontWeight: t._id === activeId ? 600 : 400,
                borderBottom: '1px solid #f1f5f9'
              }}
              onMouseEnter={e => { if (t._id !== activeId) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (t._id !== activeId) e.currentTarget.style.background = '#fff'; }}
            >
              <span style={{ flex: 1 }}>{t.templateName}</span>
              {t.isDefault && <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Default</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
const OpdPrintConfig = () => {
  const [cfg, setCfg]                     = useState(DEFAULT_CONFIG);
  const [activeId, setActiveId]           = useState(null);
  const [templates, setTemplates]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [doctor, setDoctor]               = useState(null);
  const [clinic, setClinic]               = useState(null);
  const [editingName, setEditingName]     = useState(false);
  const [hdrUploading, setHdrUploading]   = useState(false);
  const [ftrUploading, setFtrUploading]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState('');

  /* ── Load on mount ───────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [allTemplates, allStaff, allClinics] = await Promise.all([
          printConfigService.getAllTemplates().catch(() => []),
          adminService.getStaff().catch(() => []),
          clinicService.getAllClinics().catch(() => []),
        ]);

        setTemplates(allTemplates);

        // Load default (or first) template's full config
        if (allTemplates.length > 0) {
          const def = allTemplates.find(t => t.isDefault) || allTemplates[0];
          setActiveId(def._id);
          const full = await printConfigService.getPrintConfig(def._id);
          setCfg({ ...DEFAULT_CONFIG, ...full });
        }

        // Doctor profile
        const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const doc = (Array.isArray(allStaff) ? allStaff : []).find(
          s => s.role === 'Doctor' && (s.email === loggedUser.email || s.name?.toLowerCase() === loggedUser.name?.toLowerCase())
        ) || (Array.isArray(allStaff) ? allStaff : []).find(s => s.role === 'Doctor') || null;
        setDoctor(doc);

        const storedId = localStorage.getItem('clinicId');
        setClinic(allClinics.find(c => c._id === storedId) || allClinics[0] || null);
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── Switch template ─────────────────────────────────────────────────── */
  const handleSelectTemplate = async (id) => {
    try {
      setLoading(true);
      const full = await printConfigService.getPrintConfig(id);
      setActiveId(id);
      setCfg({ ...DEFAULT_CONFIG, ...full });
    } catch (e) {
      alert('Could not load template');
    } finally {
      setLoading(false);
    }
  };

  /* ── Create New template ─────────────────────────────────────────────── */
  const handleCreateNew = async () => {
    if (!newTemplateName.trim()) { setCreateError('Enter a template name'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const newTpl = await printConfigService.createTemplate(newTemplateName.trim(), activeId);
      const newList = await printConfigService.getAllTemplates();
      setTemplates(newList);
      setActiveId(newTpl._id);
      setCfg({ ...DEFAULT_CONFIG, ...newTpl });
      setShowCreateModal(false);
      setNewTemplateName('');
    } catch (e) {
      setCreateError(e.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  /* ── Save settings ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      let saved;
      if (activeId) {
        saved = await printConfigService.savePrintConfig(activeId, cfg);
      } else {
        // First-time save — create default template
        saved = await printConfigService.createTemplate('Default Print Template');
        const full = await printConfigService.savePrintConfig(saved._id, cfg);
        setActiveId(full._id);
        saved = full;
      }
      // Refresh template list (isDefault may have changed)
      const newList = await printConfigService.getAllTemplates();
      setTemplates(newList);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete template ─────────────────────────────────────────────────── */
  const handleDeleteTemplate = async () => {
    if (!activeId) return;
    if (cfg.isDefault) { alert('Cannot delete the default template. Set another as default first.'); return; }
    if (!window.confirm(`Delete template "${cfg.templateName}"? This cannot be undone.`)) return;
    try {
      await printConfigService.deleteTemplate(activeId);
      const newList = await printConfigService.getAllTemplates();
      setTemplates(newList);
      if (newList.length > 0) {
        const def = newList.find(t => t.isDefault) || newList[0];
        setActiveId(def._id);
        const full = await printConfigService.getPrintConfig(def._id);
        setCfg({ ...DEFAULT_CONFIG, ...full });
      } else {
        setActiveId(null);
        setCfg(DEFAULT_CONFIG);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete template');
    }
  };

  /* ── Image uploads ───────────────────────────────────────────────────── */
  const handleHeaderUpload = async (file) => {
    setHdrUploading(true);
    try {
      const { headerImage } = await printConfigService.uploadHeaderImage(activeId, file);
      setCfg(p => ({ ...p, headerImage }));
    } catch { alert('Header upload failed'); }
    finally { setHdrUploading(false); }
  };
  const handleFooterUpload = async (file) => {
    setFtrUploading(true);
    try {
      const { footerImage } = await printConfigService.uploadFooterImage(activeId, file);
      setCfg(p => ({ ...p, footerImage }));
    } catch { alert('Footer upload failed'); }
    finally { setFtrUploading(false); }
  };
  const handleClearHeader = async () => {
    try { await printConfigService.clearImage('header', activeId); setCfg(p => ({ ...p, headerImage: null })); }
    catch { alert('Failed to clear'); }
  };
  const handleClearFooter = async () => {
    try { await printConfigService.clearImage('footer', activeId); setCfg(p => ({ ...p, footerImage: null })); }
    catch { alert('Failed to clear'); }
  };

  /* ── Print Preview ───────────────────────────────────────────────────── */
  const handlePrintPreview = () => {
    const previewWin = window.open('', '_blank', 'width=800,height=900');
    const rawName    = (doctor?.name || '').replace(/^dr\.?\s*/i, '').trim();
    const doctorName = rawName ? `DR. ${rawName.toUpperCase()}` : 'DR. DOCTOR';
    const clinicPhone = clinic?.phone || doctor?.contactForPrescription || '';
    const clinicLogo  = clinic?.logo ? `${API_BASE}/${clinic.logo.replace(/^\/+/, '')}` : null;
    const sig         = doctor?.signatureImage || '';
    const sigName     = cfg.signatureText || (rawName ? `Dr. ${rawName}` : 'Dr. Doctor');

    previewWin.document.write(`<!DOCTYPE html><html><head>
      <title>Print Preview — ${cfg.templateName}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:"${cfg.fontFamily}",sans-serif; font-size:${cfg.fontSize}px; color:#000; background:#fff; padding:12mm ${cfg.printMarginLeft}px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .doctor-name { color:#0056b3; font-weight:800; font-size:1.8rem; letter-spacing:1px; }
        .doctor-details { color:#00a8cc; font-size:0.85rem; line-height:1.5; font-weight:700; margin-top:8px; }
        .clinic-phone { color:#0056b3; font-size:1.2rem; font-weight:800; }
        .divider { border-bottom:3px dotted #0056b3; margin:12px 0; }
        .patient-row { display:flex; gap:20px; font-weight:700; font-size:0.9rem; margin-bottom:4px; }
        .rx { font-size:1.5rem; margin:8px 0 4px; }
        .footer { margin-top:auto; text-align:center; border-top:1px solid #0056b3; padding-top:8px; font-size:0.75rem; color:#0056b3; font-weight:bold; }
        .sig-area { text-align:right; margin-top:40px; }
        .sig-line { height:40px; width:160px; border-bottom:2px solid #333; display:inline-block; margin-bottom:4px; }
        @media print { body { padding:0; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="doctor-name">${doctorName}</div>
          <div class="doctor-details">
            ${doctor?.qualifications ? `<div>${doctor.qualifications}</div>` : ''}
            ${doctor?.speciality ? `<div>${doctor.speciality}</div>` : ''}
            ${doctor?.bio ? `<div>${doctor.bio}</div>` : ''}
            ${doctor?.registrationNo ? `<div>${doctor.registrationNo}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          ${clinicLogo ? `<img src="${clinicLogo}" style="max-height:80px;max-width:200px;object-fit:contain;" />` : `<span style="font-size:1.8rem;font-weight:900;font-style:italic;color:#0056b3;">${clinic?.name || ''}</span>`}
          ${clinicPhone ? `<div class="clinic-phone">📞 ${clinicPhone}</div>` : ''}
        </div>
      </div>
      <div class="divider"></div>
      <div class="patient-row">
        <span>NAME : <u><b>SAMPLE PATIENT</b></u></span>
        <span>AGE/SEX : <u><b>30Y / M</b></u></span>
        <span style="margin-left:auto">DATE : <u><b>${moment().format('DD-MMM-YYYY')}</b></u></span>
      </div>
      <div class="rx">℞</div>
      <p style="color:#999;font-size:0.85rem;text-align:center;padding:40px 0;">[ Prescription medicines will appear here ]</p>
      <div class="sig-area">
        ${cfg.printSignatureImage && sig ? `<img src="${sig}" style="height:${cfg.signatureHeightCm * 0.4}px;max-width:160px;object-fit:contain;display:block;margin-left:auto;margin-bottom:4px;" />` : '<div class="sig-line"></div><br>'}
        ${cfg.printSignatureText ? `<div style="font-weight:bold;">${sigName}</div>` : ''}
      </div>
      <div class="footer">DOCTOR CONSULTATION : DAY CARE : HOME CARE : BLOOD TEST : VACCINATION</div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`);
    previewWin.document.close();
  };

  const set = useCallback(updater => setCfg(updater), []);

  /* ── Margin field definitions ────────────────────────────────────────── */
  const printFields     = [{ key:'printMarginLeft',label:'Left'},{ key:'printMarginRight',label:'Right'},{ key:'printMarginHeaderHeight',label:'Header Height',colored:true},{ key:'printMarginFooterHeight',label:'Footer Height',colored:true},{ key:'printMarginPageHeight',label:'Page Height',colored:true}];
  const whatsappFields  = [{ key:'whatsappMarginLeft',label:'Left'},{ key:'whatsappMarginRight',label:'Right'},{ key:'whatsappMarginHeaderHeight',label:'Header Height',colored:true},{ key:'whatsappMarginFooterHeight',label:'Footer Height',colored:true}];
  const formsFields     = [{ key:'formsMarginLeft',label:'Left'},{ key:'formsMarginRight',label:'Right'},{ key:'formsMarginHeaderHeight',label:'Header Height',colored:true},{ key:'formsMarginFooterHeight',label:'Footer Height',colored:true}];

  if (loading) return (
    <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', background:'#f1f5f9' }}>
      <div className="text-center"><Loader2 size={36} className="spin" style={{ color:'#2563eb' }} /><div className="mt-2 text-muted">Loading OPD Print Settings…</div></div>
    </div>
  );

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'#f1f5f9', padding:'24px' }}>
      <style>{`
        .spin{animation:spin 1s linear infinite;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .opd-section{background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.07);padding:20px 24px;margin-bottom:16px;}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;}
        .toggle-row:last-child{border-bottom:none;}
        .toggle-label{font-size:.88rem;color:#374151;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;}
        .modal-box{background:#fff;border-radius:12px;padding:28px;width:420px;box-shadow:0 20px 60px rgba(0,0,0,.2);}
      `}</style>

      {/* Create New Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h5 className="fw-bold mb-1" style={{ color:'#1e293b' }}>Create New Template</h5>
            <p className="text-muted mb-3" style={{ fontSize:'0.83rem' }}>Current settings will be copied to the new template.</p>
            <label className="form-label" style={{ fontSize:'0.82rem', fontWeight:600 }}>Template Name</label>
            <input
              className="form-control mb-2"
              placeholder="e.g. Paediatrics Layout"
              value={newTemplateName}
              autoFocus
              onChange={e => { setNewTemplateName(e.target.value); setCreateError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateNew(); }}
            />
            {createError && <div className="text-danger mb-2" style={{ fontSize:'0.8rem' }}>{createError}</div>}
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button className="btn btn-outline-secondary" onClick={() => { setShowCreateModal(false); setNewTemplateName(''); setCreateError(''); }}>Cancel</button>
              <button className="btn btn-primary fw-bold px-4" onClick={handleCreateNew} disabled={creating}>
                {creating ? <><Loader2 size={14} className="spin me-1" />Creating…</> : <><Plus size={14} className="me-1" />Create</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="mb-4">
        <h3 style={{ fontWeight:700, color:'#1e293b', margin:0, fontSize:'1.5rem' }}>OPD Print Preferences</h3>
        <div style={{ color:'#64748b', fontSize:'0.88rem', marginTop:4 }}>Manage your account settings and adjust your preferences</div>
      </div>

      <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>

        {/* ── Left: settings ──────────────────────────────────────── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Top card */}
          <div className="opd-section">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <div className="fw-bold" style={{ fontSize:'1rem' }}>Customize your Print</div>
                <div style={{ fontSize:'0.8rem', color:'#64748b' }}>Explore the Visit Pad View customization to see the sequence of visit pad elements.</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <TemplateDropdown templates={templates} activeId={activeId} onSelect={handleSelectTemplate} />
                <button className="btn btn-primary btn-sm fw-bold px-3" style={{ borderRadius:6, whiteSpace:'nowrap' }}
                  onClick={() => { setShowCreateModal(true); setNewTemplateName(''); setCreateError(''); }}>
                  <Plus size={14} className="me-1" /> Create New
                </button>
              </div>
            </div>

            {/* Template name inline edit */}
            <div>
              <label className="form-label mb-1" style={{ fontSize:'0.82rem', fontWeight:600 }}>Template Name</label>
              <div className="d-flex align-items-center gap-2">
                {editingName === true ? (
                  <input className="form-control form-control-sm" style={{ maxWidth:260 }}
                    value={cfg.templateName} autoFocus
                    onChange={e => set(p => ({ ...p, templateName: e.target.value }))}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }} />
                ) : (
                  <>
                    <div style={{ border:'1px solid #e2e8f0', borderRadius:6, padding:'5px 12px', fontSize:'0.88rem', fontWeight:500, background:'#f8fafc', minWidth:200 }}>
                      {cfg.templateName}
                    </div>
                    <button className="btn btn-sm btn-light" onClick={() => setEditingName(true)} title="Rename template"><Edit3 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Page Layout */}
          <div className="opd-section">
            <SectionTitle title="Page Layout Settings" />
            <MarginRow label="Print Page Margin"           note="This setting will leave a gap around the print page."         fields={printFields}    cfg={cfg} set={set} />
            <MarginRow label="Whatsapp/SMS/Email Print Margin" note="This setting will leave a gap around the Whatsapp/SMS/Email." fields={whatsappFields} cfg={cfg} set={set} />
            <MarginRow label="Forms Print Margin"          note="This setting will leave a gap around the Forms Print."        fields={formsFields}    cfg={cfg} set={set} />
          </div>

          {/* Font */}
          <div className="opd-section">
            <SectionTitle title="Default Font Setting" />
            <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:12 }}>This setting will define the font used across the print page.</div>
            <div className="d-flex flex-wrap gap-3 align-items-end">
              <div>
                <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Font Family</label>
                <select className="form-select form-select-sm" style={{ minWidth:130 }} value={cfg.fontFamily} onChange={e => set(p => ({ ...p, fontFamily: e.target.value }))}>
                  {FONT_FAMILIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Font Size</label>
                <select className="form-select form-select-sm" style={{ width:90 }} value={cfg.fontSize} onChange={e => set(p => ({ ...p, fontSize: Number(e.target.value) }))}>
                  {FONT_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Font Size Compensation</label>
                <input type="number" className="form-control form-control-sm" style={{ width:90 }} value={cfg.fontSizeCompensation}
                  onChange={e => set(p => ({ ...p, fontSizeCompensation: Number(e.target.value) }))} />
              </div>
            </div>
          </div>

          {/* Patient Image Size */}
          <div className="opd-section">
            <SectionTitle title="Patient Image Size Configuration" />
            <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:12 }}>This setting will define the width and height of the patient image.</div>
            <div className="d-flex align-items-end gap-3 flex-wrap">
              <div>
                <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Height</label>
                <input type="number" className="form-control form-control-sm" style={{ width:80 }} value={cfg.patientImageHeight} onChange={e => set(p => ({ ...p, patientImageHeight: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Width</label>
                <input type="number" className="form-control form-control-sm" style={{ width:80 }} value={cfg.patientImageWidth} onChange={e => set(p => ({ ...p, patientImageWidth: Number(e.target.value) }))} />
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={() => set(p => ({ ...p, patientImageHeight:80, patientImageWidth:150 }))}>Set to Default</button>
            </div>
          </div>

          {/* Header & Footer */}
          <div className="opd-section">
            <SectionTitle title="Header and Footer (Print and PDF)" />
            <div className="row g-3">
              <div className="col-md-6">
                <ImageUploadBox label="Header Image" value={cfg.headerImage} onUpload={handleHeaderUpload} onClear={handleClearHeader} uploading={hdrUploading} />
              </div>
              <div className="col-md-6">
                <ImageUploadBox label="Footer Image" value={cfg.footerImage} onUpload={handleFooterUpload} onClear={handleClearFooter} uploading={ftrUploading} />
              </div>
            </div>
            <div className="toggle-row mt-2">
              <span className="toggle-label">Use Own Letterhead</span>
              <Toggle id="tgl-letterhead" checked={cfg.useOwnLetterhead} onChange={v => set(p => ({ ...p, useOwnLetterhead:v }))} />
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Print Header in the First Page Only</span>
              <Toggle id="tgl-firstpage" checked={cfg.printHeaderFirstPageOnly} onChange={v => set(p => ({ ...p, printHeaderFirstPageOnly:v }))} />
            </div>
          </div>

          {/* Doctor Details */}
          <div className="opd-section">
            <SectionTitle title="Doctor Details" />
            <div className="toggle-row">
              <span className="toggle-label">Print Signature Image</span>
              <Toggle id="tgl-sigimg" checked={cfg.printSignatureImage} onChange={v => set(p => ({ ...p, printSignatureImage:v }))} />
            </div>
            {doctor?.signatureImage && (
              <div style={{ margin:'8px 0', padding:8, background:'repeating-conic-gradient(#e5e7eb 0% 25%,#f9fafb 0% 50%) 0 0/16px 16px', borderRadius:6, display:'inline-block' }}>
                <img src={doctor.signatureImage} alt="Signature" style={{ maxHeight:60, maxWidth:200, objectFit:'contain' }} />
              </div>
            )}
            <div className="mb-2 mt-1">
              <label className="form-label mb-1" style={{ fontSize:'0.8rem' }}>Enter Signature height in cm</label>
              <input type="number" className="form-control form-control-sm" style={{ width:90 }} value={cfg.signatureHeightCm}
                onChange={e => set(p => ({ ...p, signatureHeightCm: Number(e.target.value) }))} />
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Print Signature text</span>
              <Toggle id="tgl-sigtext" checked={cfg.printSignatureText} onChange={v => set(p => ({ ...p, printSignatureText:v }))} />
            </div>
            {cfg.printSignatureText && (
              <div className="d-flex align-items-center gap-2 mt-2">
                {editingName === 'sig' ? (
                  <input className="form-control form-control-sm" style={{ maxWidth:220 }} autoFocus value={cfg.signatureText}
                    onChange={e => set(p => ({ ...p, signatureText: e.target.value }))}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }} />
                ) : (
                  <>
                    <span style={{ fontSize:'0.88rem', fontWeight:500 }}>
                      {cfg.signatureText || (doctor ? `Dr. ${(doctor.name||'').replace(/^dr\.?\s*/i,'').trim()}` : 'Dr. Doctor')}
                    </span>
                    <button className="btn btn-sm btn-outline-secondary" style={{ fontSize:'0.75rem' }}
                      onClick={() => {
                        if (!cfg.signatureText && doctor) set(p => ({ ...p, signatureText:`Dr. ${(doctor.name||'').replace(/^dr\.?\s*/i,'').trim()}` }));
                        setEditingName('sig');
                      }}>Edit</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Rx Settings */}
          <div className="opd-section">
            <SectionTitle title="Rx Settings" />
            <div className="toggle-row">
              <span className="toggle-label">Print Generic Name</span>
              <Toggle id="tgl-generic" checked={cfg.printGenericName} onChange={v => set(p => ({ ...p, printGenericName:v }))} />
            </div>
            <div className="toggle-row">
              <span className="toggle-label">Tabular Print</span>
              <Toggle id="tgl-tabular" checked={cfg.tabularPrint} onChange={v => set(p => ({ ...p, tabularPrint:v }))} />
            </div>
          </div>

          {/* Patient Details */}
          <div className="opd-section">
            <SectionTitle title="Patient Details" />
            <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:8 }}>What other data do you want to include in the Print?</div>
            {[
              { key:'showPatientPhone',   label:'Patient Phone Number' },
              { key:'showPatientAddress', label:'Patient Address' },
              { key:'showReferredBy',     label:'Referred By' },
              { key:'showChannelThrough', label:'Channel Through' },
              { key:'showDepartment',     label:'Department' },
              { key:'showDoctorName',     label:'Doctor Name' },
              { key:'showVisitNumber',    label:'Visit Number' },
              { key:'showPrintTime',      label:'Print Time' },
              { key:'showValidTill',      label:'Valid Till' },
              { key:'showAbhaNumber',     label:'Abha Number' },
            ].map(({ key, label }) => (
              <div className="toggle-row" key={key}>
                <span className="toggle-label">{label}</span>
                <Toggle id={`tgl-${key}`} checked={cfg[key]} onChange={v => set(p => ({ ...p, [key]:v }))} />
              </div>
            ))}
            <div className="mt-3 mb-2">
              <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:6 }}>How do you like to view the patient details in the print?</div>
              <select className="form-select form-select-sm" style={{ maxWidth:240 }} value={cfg.patientDetailFormat} onChange={e => set(p => ({ ...p, patientDetailFormat:e.target.value }))}>
                <option value="single">Print details in single line</option>
                <option value="multi">Print details in multiple lines</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Patient name display options</div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="chk-capitalize"
                  checked={cfg.capitalizePatientName} onChange={e => set(p => ({ ...p, capitalizePatientName:e.target.checked }))} />
                <label className="form-check-label" htmlFor="chk-capitalize" style={{ fontSize:'0.88rem' }}>Capitalize Patient Name</label>
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div className="opd-section">
            <SectionTitle title="Other Details" />
            {[
              { key:'showPrintPreview',          label:'Show Print Preview before printing' },
              { key:'enableLanguageTranslation',  label:'Enable Language Translation' },
              { key:'enableBackgroundGraphics',   label:'Enable Background Graphics' },
              { key:'enableMedicineDetails',      label:'Enable Medicine Details' },
              { key:'printQRCode',                label:'Print HealthPlix App QR Code' },
            ].map(({ key, label }) => (
              <div className="toggle-row" key={key}>
                <span className="toggle-label">{label}</span>
                <Toggle id={`tgl-${key}`} checked={cfg[key]} onChange={v => set(p => ({ ...p, [key]:v }))} />
              </div>
            ))}
            <div className="mt-3">
              <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:6 }}>Default Print Language</div>
              <select className="form-select form-select-sm" style={{ maxWidth:180 }} value={cfg.defaultPrintLanguage} onChange={e => set(p => ({ ...p, defaultPrintLanguage:e.target.value }))}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Make Default + Delete */}
          <div className="opd-section">
            <SectionTitle title="Make this Print Default" />
            <div className="toggle-row">
              <span className="toggle-label">Change this print to default state</span>
              <Toggle id="tgl-isdefault" checked={cfg.isDefault} onChange={v => set(p => ({ ...p, isDefault:v }))} />
            </div>
            <div className="mt-4 pt-2">
              <button
                className="btn btn-danger btn-sm fw-semibold"
                onClick={handleDeleteTemplate}
                disabled={cfg.isDefault || !activeId}
                title={cfg.isDefault ? 'Cannot delete the default template' : 'Delete this template'}
              >
                <Trash2 size={14} className="me-1" /> Delete This Template
              </button>
              {cfg.isDefault && (
                <div className="text-muted mt-1" style={{ fontSize:'0.75rem' }}>Set another template as default before deleting this one.</div>
              )}
            </div>
          </div>

        </div>

        {/* ── Right: live preview ──────────────────────────────────── */}
        <div style={{ width:370, flexShrink:0, position:'sticky', top:0 }}>
          <div className="opd-section" style={{ padding:16 }}>
            <PrintPreview cfg={cfg} doctor={doctor} clinic={clinic} />
            <div className="d-flex gap-2 mt-3 justify-content-center">
              <button className="btn btn-primary btn-sm fw-bold px-3" onClick={handlePrintPreview}>
                <Printer size={14} className="me-1" /> Print Preview
              </button>
              <button className="btn btn-outline-primary btn-sm fw-bold px-3" onClick={() => { handlePrintPreview(); }}>
                <FileText size={14} className="me-1" /> PDF Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div style={{ position:'sticky', bottom:0, left:0, right:0, background:'linear-gradient(180deg,transparent 0%,#f1f5f9 30%)', padding:'12px 0 0', display:'flex', justifyContent:'flex-end', zIndex:10 }}>
        <button
          className="btn fw-bold px-5"
          style={{ background:'#2563eb', color:'#fff', borderRadius:8, fontSize:'0.95rem', boxShadow:'0 4px 14px rgba(37,99,235,.4)' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><Loader2 size={16} className="spin me-2" />Saving…</> :
           saved  ? <><CheckCircle size={16} className="me-2" />Saved!</> :
                    <><Save size={16} className="me-2" />Save Settings</>}
        </button>
      </div>
    </div>
  );
};

export default OpdPrintConfig;
