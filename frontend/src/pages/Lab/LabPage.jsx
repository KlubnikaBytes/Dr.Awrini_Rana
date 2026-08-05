import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import doctorService from '../../services/doctorService';
import {
  Microscope, Search, Plus, Printer, User, Calendar, Clock,
  CheckCircle, XCircle, Activity, Loader, RefreshCw, Edit3, X,
  FileText, Beaker, AlertCircle, ChevronRight, BarChart2, Trash2
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */
const API = `${import.meta.env.VITE_API_URL}/laborders/`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TEST_CATEGORIES = {
  "HAEMATOLOGY": [
    "Absolute Eosinophil Count (cells/cumm)","Haemoglobin (Hb) (Gms %)","Total WBC Count (Cells/cu mm)",
    "Haematocrit (PCV) (%)","Neutrophils (%)","Lymphocytes (%)","Eosinophils (%)","Monocytes (%)",
    "Basophils (%)","RBC (million cells/cu mm)","ESR (mm/hour)","MCV (fL)","MCH (pg)","Platelets (-)"
  ],
  "BIO CHEMISTRY": [
    "Fasting Blood Sugar (FBS) (mg/dL)","Post Prandial Blood Sugar (PPBS) (mg/dL)",
    "Glycosylated Haemoglobin - HbA1c (%)","Random Blood Sugar - RBS (mg/dL)","Ketone (-)","Protein (-)"
  ],
  "LIPID PROFILE": [
    "Total Cholesterol (mg/dL)","Serum HDL Cholesterol (mg/dL)","Serum Triglycerides (mg/dL)",
    "Serum LDL Cholesterol (mg/dL)","Serum VLDL Cholesterol (mg/dL)","Non HDL Cholesterol (mg/dL)"
  ],
  "KIDNEY FUNCTION TEST": [
    "Blood Urea (mg/dL)","Serum Creatinine (mg/dL)","Serum Sodium (Na+) (mEq/L)",
    "Serum Potassium (K+) (mEq/L)","Serum Uric Acid (mg/dL)","eGFR (mL/min/1.73m2)"
  ],
  "LIVER FUNCTION TEST": [
    "Serum Bilirubin Total (mg/dL)","Serum Bilirubin Direct (mg/dL)",
    "Serum Protein - Total (g/dL)","Serum Protein - Albumin (g/dL)",
    "SGOT (AST) (IU/L)","SGPT (ALT) (IU/L)","Serum Alkaline Phosphatase (IU/L)","GGT (IU/L)"
  ],
  "UACR": ["Urine Albumin (mg/L)","Urine Creatinine (mg/dL)","Spot Albumin Creatinine Ratio (mg/g)"],
  "URINE ROUTINE": [
    "Colour (-)","Appearance (-)","Albumin (-)","Sugar (-)","Pus Cells (-)","RBCs (-)",
    "Casts (-)","Crystals (-)","Specific Gravity (-)","Urine PH (-)"
  ],
  "THYROID FUNCTION TEST": [
    "TSH (mIU/L)","T3 (ng/dL)","T4 (µg/dL)","Free T3 (ng/mL)","Free T4 (ng/dL)"
  ],
  "PCOS / Infertility": [
    "LH (mIU/mL)","FSH (mIU/mL)","Prolactin (ng/mL)","Testosterone Total (ng/dL)","DHEAS (-)"
  ],
  "OTHERS": ["ECG (-)","ULTRASOUND (-)","FNAC (-)","X-Ray (-)","MRI (-)"]
};

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

/* ─── Step 1: Register Patient ───────────────────────────────── */
const RegisterModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    patientName:'', patientAge:'', patientGender:'Male', patientPhone:'',
    uhid:'', referredBy:'', sampleType:'Blood', priority:'Routine',
    orderedDate: new Date().toISOString().split('T')[0], notes:''
  });
  const [step, setStep] = useState(1); // 1=patient info, 2=test selection
  const [selectedTests, setSelectedTests] = useState({});
  const [activecat, setActivecat] = useState('HAEMATOLOGY');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

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
    ? Object.entries(TEST_CATEGORIES).flatMap(([cat, tests]) =>
        tests.filter(t => t.toLowerCase().includes(search.toLowerCase())).map(t => ({ cat, t }))
      )
    : TEST_CATEGORIES[activecat]?.map(t => ({ cat: activecat, t })) || [];

  const handleSubmit = async () => {
    if (totalSelected === 0) return alert('Please select at least one test');
    setSaving(true);
    try {
      const tests = Object.values(selectedTests);
      const payload = { ...form, tests, orderedDate: new Date(form.orderedDate), status: 'Registered' };
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
                    {label:'Phone',name:'patientPhone',ph:'+91 9xxxxxxx',half:true},
                  ].map(f=>(
                    <div key={f.name} className={f.half?'col-md-6':'col-12'}>
                      <label className="form-label mb-1 fw-semibold" style={{ fontSize:'0.78rem', color:'#64748b', textTransform:'uppercase' }}>{f.label}</label>
                      <input className="form-control shadow-none" style={{ border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:'0.88rem' }}
                        name={f.name} value={form[f.name]} placeholder={f.ph}
                        onChange={e=>setForm(x=>({...x,[e.target.name]:e.target.value}))}/>
                    </div>
                  ))}
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
                    {Object.keys(TEST_CATEGORIES).map(cat=>{
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
                    {!search&&<button className="btn btn-sm ms-auto" style={{ fontSize:'0.72rem', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 10px' }}
                      onClick={()=>{
                        const cats=search?[...new Set(filteredTests.map(x=>x.cat))]:[[activecat]];
                        const cat=activecat;
                        const allSelected=TEST_CATEGORIES[cat].every(t=>selectedTests[`${cat}||${t}`]);
                        const n={...selectedTests};
                        TEST_CATEGORIES[cat].forEach(t=>{
                          const k=`${cat}||${t}`;
                          if(allSelected) delete n[k]; else n[k]={category:cat,name:t,value:'',unit:parseUnit(t),status:'Pending'};
                        });
                        setSelectedTests(n);
                      }}>
                      {TEST_CATEGORIES[activecat].every(t=>selectedTests[`${activecat}||${t}`])?'Deselect All':'Select All'}
                    </button>}
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
const PrintReport = ({ order, ref: r }) => {
  const grouped = {};
  (order.tests||[]).forEach(t=>{ if(!grouped[t.category]) grouped[t.category]=[]; grouped[t.category].push(t); });
  return (
    <div ref={r} style={{ fontFamily:'Arial,sans-serif', padding:24, maxWidth:800, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:24, borderBottom:'2px solid #2563eb', paddingBottom:16 }}>
        <h2 style={{ margin:0, color:'#1d4ed8' }}>Dr. Aswini Rana Clinic</h2>
        <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Laboratory Investigation Report</p>
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
    </div>
  );
};

/* ─── Detail Panel ─────────────────────────────────────────── */
const DetailPanel = ({ order, onClose, onEnterResults, onDelete }) => {
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

  return (
    <div className="d-flex flex-column h-100 bg-white" style={{ borderLeft:'1px solid #e2e8f0' }}>
      <div className="px-4 py-3 d-flex align-items-start justify-content-between flex-shrink-0" style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div>
          <div className="text-white fw-bold" style={{ fontSize:'1rem' }}>{order.patientName}</div>
          <div className="text-white opacity-75 small">{order.patientGender} · {order.patientAge?`${order.patientAge} yrs`:''} · {order.patientPhone||''}</div>
          <div className="mt-1 d-flex gap-2">
            <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>{order.status}</span>
            <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor:p.bg, color:p.color, fontSize:'0.7rem', fontWeight:700 }}>{order.priority}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          {order.status==='Completed'&&<button className="btn btn-sm fw-semibold" style={{ backgroundColor:'#fff', color:'#2563eb', borderRadius:8, border:'none', fontSize:'0.78rem' }} onClick={handlePrint}><Printer size={13} className="me-1"/>Print</button>}
          <button className="btn btn-sm bg-white bg-opacity-20 text-white" style={{ borderRadius:8, border:'none' }} onClick={onClose}><X size={15}/></button>
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
  const [orders, setOrders]       = useState([]);
  const [pastResults, setPast]    = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch]       = useState('');
  const [statusFilter, setSF]     = useState('All');
  const [showReg, setShowReg]     = useState(false);
  const [enterFor, setEnterFor]   = useState(null);
  const [detail, setDetail]       = useState(null);

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

          <div className="flex-grow-1 overflow-auto p-4">
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
                <div className={detail?'d-flex flex-column gap-3':'row g-3'}>
                  {filtered.map(o=>{
                    const s=STATUS_CFG[o.status]||STATUS_CFG['Registered'];
                    const p=PRIORITY_CFG[o.priority]||PRIORITY_CFG['Routine'];
                    const done=(o.tests||[]).filter(t=>t.value).length;
                    const total=(o.tests||[]).length;
                    const sel=detail?._id===o._id;
                    const grouped={};
                    (o.tests||[]).forEach(t=>{grouped[t.category]=(grouped[t.category]||0)+1;});
                    return (
                      <div key={o._id} className={detail?'':'col-xl-4 col-lg-6 col-md-6'}>
                        <div className="card border-0 shadow-sm h-100"
                          style={{ borderRadius:14, cursor:'pointer', outline:sel?'2px solid #2563eb':'none', transition:'all 0.18s' }}
                          onMouseEnter={e=>!sel&&(e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)')}
                          onMouseLeave={e=>!sel&&(e.currentTarget.style.boxShadow='')}
                          onClick={()=>setDetail(o)}>
                          <div style={{ height:4, background:`linear-gradient(90deg,${s.color},${s.color}88)`, borderRadius:'14px 14px 0 0' }}></div>
                          <div className="p-3">
                            <div className="d-flex align-items-start justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width:36,height:36, backgroundColor:'#2563eb', fontSize:'0.85rem' }}>
                                  {o.patientName?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize:'0.9rem' }}>{o.patientName}</div>
                                  <div className="text-secondary" style={{ fontSize:'0.75rem' }}>{o.patientGender}·{o.patientAge}yrs {o.patientPhone?`·${o.patientPhone}`:''}</div>
                                </div>
                              </div>
                              <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>{o.status}</span>
                            </div>

                            <div className="d-flex flex-wrap gap-1 mb-2">
                              {Object.entries(grouped).map(([cat,cnt])=>(
                                <span key={cat} className="badge rounded-pill px-2" style={{ backgroundColor:(CAT_COLORS[cat]||'#475569')+'18', color:CAT_COLORS[cat]||'#475569', fontSize:'0.68rem', fontWeight:600 }}>
                                  {cat.split(' ')[0]} ({cnt})
                                </span>
                              ))}
                            </div>

                            <div className="d-flex align-items-center gap-2 mb-2 text-secondary" style={{ fontSize:'0.75rem' }}>
                              <Calendar size={11}/>{fmt(o.orderedDate)}
                              {o.referredBy&&<><ChevronRight size={10}/><span>Dr. {o.referredBy}</span></>}
                              <span className="badge rounded-pill ms-auto" style={{ backgroundColor:p.bg, color:p.color, fontSize:'0.65rem' }}>{o.priority}</span>
                            </div>

                            {/* Progress */}
                            <div>
                              <div className="d-flex justify-content-between mb-1">
                                <span className="text-secondary" style={{ fontSize:'0.7rem' }}>{done}/{total} results</span>
                                <span style={{ fontSize:'0.7rem', color:'#059669', fontWeight:600 }}>{total?Math.round(done/total*100):0}%</span>
                              </div>
                              <div className="rounded-pill overflow-hidden" style={{ height:4, backgroundColor:'#e2e8f0' }}>
                                <div style={{ height:'100%', width:`${total?Math.round(done/total*100):0}%`, backgroundColor:'#059669', borderRadius:10 }}></div>
                              </div>
                            </div>
                          </div>
                          <div className="card-footer bg-white border-0 px-3 pb-3 pt-0">
                            <button className="btn btn-sm w-100 fw-semibold rounded-pill" style={{ background:'linear-gradient(135deg,#064e3b,#059669)', color:'#fff', border:'none', fontSize:'0.78rem' }}
                              onClick={e=>{e.stopPropagation();setEnterFor(o);}}>
                              {done>0?'Update Results':'Enter Results'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              onDelete={handleDelete}/>
          </div>
        )}
      </div>

      {showReg && <RegisterModal onSave={handleRegister} onClose={()=>setShowReg(false)}/>}
      {enterFor && <EnterResultsModal order={enterFor} onSave={handleSaveResults} onClose={()=>setEnterFor(null)}/>}

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fw-black{font-weight:900!important}
      `}</style>
    </div>
  );
}
