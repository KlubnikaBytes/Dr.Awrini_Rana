import React, { useState, useEffect, useRef } from 'react';
import dayCareService from '../../services/dayCareService';
import Navbar from '../../components/Navbar';
import useWebSocket from '../../hooks/useWebSocket';
import {
  Plus, Sun, User, Calendar, Clock, FileText, Upload, Trash2,
  CheckCircle, XCircle, Activity, Loader, Search, Edit3, X,
  Phone, Stethoscope, Shield, Clipboard, Heart, Syringe,
  Pill, ExternalLink, ThermometerSun, AlertCircle
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */
const STATUS_CFG = {
  'Admitted':          { color:'#3b82f6', bg:'#dbeafe',  icon:<Activity size={11}/> },
  'Under Observation': { color:'#d97706', bg:'#fef3c7',  icon:<AlertCircle size={11}/> },
  'Discharged':        { color:'#059669', bg:'#d1fae5',  icon:<CheckCircle size={11}/> },
  'Cancelled':         { color:'#dc2626', bg:'#fee2e2',  icon:<XCircle size={11}/> },
};

const VACCINE_SITES   = ['','Left Arm','Right Arm','Left Thigh','Right Thigh','Oral','Other'];
const VACCINE_ROUTES  = ['','IM','SC','IV','Oral','ID','Other'];
const MED_ROUTES      = ['','Oral','IV','IM','SC','Topical','Inhalation','Other'];
const PROC_EXAMPLES   = ['Blood Test','Dressing','IV Infusion','ECG','X-Ray','Ultrasound','Nebulization','Suture Removal','Other'];
const COMMON_VACCINES = ['BCG','OPV','DPT','Hepatitis B','MMR','Typhoid','Varicella','Influenza','Rabies','Tetanus Toxoid','Other'];

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

/* ─── Helpers ───────────────────────────────────────────────── */
const SL = ({ color, label }) => (
  <div className="d-flex align-items-center gap-2 mb-3">
    <div style={{ width:3, height:16, backgroundColor:color, borderRadius:2 }}></div>
    <span className="fw-bold text-uppercase text-secondary" style={{ fontSize:'0.72rem', letterSpacing:'0.5px' }}>{label}</span>
    <div className="flex-grow-1" style={{ height:1, backgroundColor:'#f1f5f9' }}></div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="mb-3">
    <div style={{ fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.4px', color:'#94a3b8', fontWeight:700 }}>{label}</div>
    <div className="fw-semibold text-dark" style={{ fontSize:'0.88rem' }}>{value || <span className="text-secondary fst-italic fw-normal">—</span>}</div>
  </div>
);

const inp = { className:'form-control shadow-none', style:{ fontSize:'0.85rem', border:'1.5px solid #e2e8f0', borderRadius:8 } };
const sel = { className:'form-select shadow-none', style:{ fontSize:'0.85rem', border:'1.5px solid #e2e8f0', borderRadius:8 } };

/* ─── Vaccine Row Editor ──────────────────────────────────────── */
const VaccineRows = ({ items, onChange }) => {
  const add  = () => onChange([...items, { vaccineName:'', dose:'', batchNumber:'', site:'', route:'IM', givenAt:'', givenBy:'' }]);
  const del  = i  => onChange(items.filter((_,idx)=>idx!==i));
  const edit = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a); };

  return (
    <div>
      <table className="table table-borderless mb-2" style={{ fontSize:'0.8rem' }}>
        <thead><tr style={{ backgroundColor:'#f8fafc' }}>
          <th>Vaccine</th><th>Dose</th><th>Batch #</th><th>Site</th><th>Route</th><th>Given At</th><th>Given By</th><th></th>
        </tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={8} className="text-center text-secondary py-3 fst-italic">No vaccines added. Click + Add below.</td></tr>
          )}
          {items.map((v,i) => (
            <tr key={i}>
              <td><select {...sel} value={v.vaccineName} onChange={e=>edit(i,'vaccineName',e.target.value)}>
                {COMMON_VACCINES.map(n=><option key={n}>{n}</option>)}</select></td>
              <td><input {...inp} value={v.dose} placeholder="e.g. 0.5ml" onChange={e=>edit(i,'dose',e.target.value)}/></td>
              <td><input {...inp} value={v.batchNumber} placeholder="Batch" onChange={e=>edit(i,'batchNumber',e.target.value)}/></td>
              <td><select {...sel} value={v.site} onChange={e=>edit(i,'site',e.target.value)}>
                {VACCINE_SITES.map(s=><option key={s}>{s}</option>)}</select></td>
              <td><select {...sel} value={v.route} onChange={e=>edit(i,'route',e.target.value)}>
                {VACCINE_ROUTES.map(r=><option key={r}>{r}</option>)}</select></td>
              <td><input {...inp} type="datetime-local" value={v.givenAt} onChange={e=>edit(i,'givenAt',e.target.value)}/></td>
              <td><input {...inp} value={v.givenBy} placeholder="Name" onChange={e=>edit(i,'givenBy',e.target.value)}/></td>
              <td><button type="button" className="btn btn-sm btn-outline-danger p-1 rounded-circle" onClick={()=>del(i)}><X size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={add}><Plus size={13} className="me-1"/>Add Vaccine</button>
    </div>
  );
};

/* ─── Medication Row Editor ─────────────────────────────────── */
const MedRows = ({ items, onChange }) => {
  const add  = () => onChange([...items, { name:'', dosage:'', route:'Oral', frequency:'', givenAt:'', givenBy:'' }]);
  const del  = i  => onChange(items.filter((_,idx)=>idx!==i));
  const edit = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a); };

  return (
    <div>
      <table className="table table-borderless mb-2" style={{ fontSize:'0.8rem' }}>
        <thead><tr style={{ backgroundColor:'#f8fafc' }}>
          <th>Medicine</th><th>Dosage</th><th>Route</th><th>Frequency</th><th>Given At</th><th>Given By</th><th></th>
        </tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={7} className="text-center text-secondary py-3 fst-italic">No medications added. Click + Add below.</td></tr>
          )}
          {items.map((m,i)=>(
            <tr key={i}>
              <td><input {...inp} value={m.name} placeholder="Medicine name" onChange={e=>edit(i,'name',e.target.value)}/></td>
              <td><input {...inp} value={m.dosage} placeholder="e.g. 500mg" onChange={e=>edit(i,'dosage',e.target.value)}/></td>
              <td><select {...sel} value={m.route} onChange={e=>edit(i,'route',e.target.value)}>
                {MED_ROUTES.map(r=><option key={r}>{r}</option>)}</select></td>
              <td><input {...inp} value={m.frequency} placeholder="e.g. BD" onChange={e=>edit(i,'frequency',e.target.value)}/></td>
              <td><input {...inp} type="datetime-local" value={m.givenAt} onChange={e=>edit(i,'givenAt',e.target.value)}/></td>
              <td><input {...inp} value={m.givenBy} placeholder="Name" onChange={e=>edit(i,'givenBy',e.target.value)}/></td>
              <td><button type="button" className="btn btn-sm btn-outline-danger p-1 rounded-circle" onClick={()=>del(i)}><X size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={add}><Plus size={13} className="me-1"/>Add Medication</button>
    </div>
  );
};

/* ─── Procedure Row Editor ─────────────────────────────────── */
const ProcRows = ({ items, onChange }) => {
  const add  = () => onChange([...items, { name:'', description:'', performedAt:'', performedBy:'' }]);
  const del  = i  => onChange(items.filter((_,idx)=>idx!==i));
  const edit = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a); };

  return (
    <div>
      <table className="table table-borderless mb-2" style={{ fontSize:'0.8rem' }}>
        <thead><tr style={{ backgroundColor:'#f8fafc' }}>
          <th>Procedure</th><th>Description</th><th>Performed At</th><th>Performed By</th><th></th>
        </tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={5} className="text-center text-secondary py-3 fst-italic">No procedures added.</td></tr>
          )}
          {items.map((p,i)=>(
            <tr key={i}>
              <td><select {...sel} value={p.name} onChange={e=>edit(i,'name',e.target.value)}>
                <option value="">Select...</option>
                {PROC_EXAMPLES.map(n=><option key={n}>{n}</option>)}</select></td>
              <td><input {...inp} value={p.description} placeholder="Details" onChange={e=>edit(i,'description',e.target.value)}/></td>
              <td><input {...inp} type="datetime-local" value={p.performedAt} onChange={e=>edit(i,'performedAt',e.target.value)}/></td>
              <td><input {...inp} value={p.performedBy} placeholder="Name" onChange={e=>edit(i,'performedBy',e.target.value)}/></td>
              <td><button type="button" className="btn btn-sm btn-outline-danger p-1 rounded-circle" onClick={()=>del(i)}><X size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={add}><Plus size={13} className="me-1"/>Add Procedure</button>
    </div>
  );
};

/* ─── Vitals Row Editor ─────────────────────────────────────── */
const VitalsRows = ({ items, onChange }) => {
  const add  = () => onChange([...items, { recordedAt:'', bp:'', pulse:'', temperature:'', spO2:'', rbs:'', weight:'', notes:'' }]);
  const del  = i  => onChange(items.filter((_,idx)=>idx!==i));
  const edit = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; onChange(a); };

  return (
    <div>
      <table className="table table-borderless mb-2" style={{ fontSize:'0.8rem' }}>
        <thead><tr style={{ backgroundColor:'#f8fafc' }}>
          <th>Time</th><th>BP</th><th>Pulse</th><th>Temp (°F)</th><th>SpO2 (%)</th><th>RBS</th><th>Wt (kg)</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={9} className="text-center text-secondary py-3 fst-italic">No vitals recorded.</td></tr>
          )}
          {items.map((v,i)=>(
            <tr key={i}>
              <td><input {...inp} type="datetime-local" value={v.recordedAt} onChange={e=>edit(i,'recordedAt',e.target.value)}/></td>
              <td><input {...inp} value={v.bp} placeholder="120/80" onChange={e=>edit(i,'bp',e.target.value)}/></td>
              <td><input {...inp} value={v.pulse} placeholder="72" onChange={e=>edit(i,'pulse',e.target.value)}/></td>
              <td><input {...inp} value={v.temperature} placeholder="98.6" onChange={e=>edit(i,'temperature',e.target.value)}/></td>
              <td><input {...inp} value={v.spO2} placeholder="98" onChange={e=>edit(i,'spO2',e.target.value)}/></td>
              <td><input {...inp} value={v.rbs} placeholder="mg/dL" onChange={e=>edit(i,'rbs',e.target.value)}/></td>
              <td><input {...inp} value={v.weight} placeholder="kg" onChange={e=>edit(i,'weight',e.target.value)}/></td>
              <td><input {...inp} value={v.notes} placeholder="Remarks" onChange={e=>edit(i,'notes',e.target.value)}/></td>
              <td><button type="button" className="btn btn-sm btn-outline-danger p-1 rounded-circle" onClick={()=>del(i)}><X size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={add}><Plus size={13} className="me-1"/>Record Vitals</button>
    </div>
  );
};

/* ─── Create / Edit Modal ────────────────────────────────────── */
const EMPTY = {
  patientName:'', patientAge:'', patientGender:'Male', patientPhone:'', patientAddress:'', uhid:'', diagnosis:'', chiefComplaint:'',
  admissionDate:'', admissionTime:'', bedNumber:'', ward:'',
  doctorName:'', doctorDesignation:'', nurseInCharge:'',
  procedures:[], medications:[], vaccines:[], vitals:[],
  dischargeDate:'', dischargeTime:'', dischargeNotes:'', followUpDate:'', followUpNotes:'',
  status:'Admitted', notes:''
};

const RecordModal = ({ initial, onSave, onClose }) => {
  const [form, setForm]     = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY });
  const [pendingFiles, setPF]= useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState('patient');
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const onC = (e)    => set(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const rec = await onSave(form);
      if (rec && pendingFiles.length) {
        for (const f of pendingFiles) await dayCareService.uploadDoc(rec._id, f);
      }
    } finally { setSaving(false); }
  };

  const F = ({ label, name, type='text', opts, req, ph, half }) => (
    <div className={half ? 'col-md-6' : 'col-12'}>
      <label className="form-label mb-1" style={{ fontSize:'0.72rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.3px' }}>
        {label}{req && <span className="text-danger ms-1">*</span>}
      </label>
      {opts ? (
        <select {...sel} name={name} value={form[name]} onChange={onC} required={req}>
          {opts.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
        </select>
      ) : (
        <input {...inp} type={type} name={name} value={form[name]} onChange={onC} required={req} placeholder={ph}/>
      )}
    </div>
  );

  const TABS = [
    { id:'patient',    label:'Patient',    icon:<User size={13}/> },
    { id:'admission',  label:'Admission',  icon:<Clipboard size={13}/> },
    { id:'staff',      label:'Staff',      icon:<Stethoscope size={13}/> },
    { id:'vaccines',   label:'Vaccines',   icon:<Shield size={13}/> },
    { id:'medications',label:'Medications',icon:<Pill size={13}/> },
    { id:'procedures', label:'Procedures', icon:<Activity size={13}/> },
    { id:'vitals',     label:'Vitals',     icon:<Heart size={13}/> },
    { id:'discharge',  label:'Discharge',  icon:<CheckCircle size={13}/> },
    { id:'documents',  label:'Documents',  icon:<FileText size={13}/> },
  ];

  return (
    <div className="modal d-block" style={{ backgroundColor:'rgba(15,23,42,0.65)', zIndex:1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth:900 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius:16, overflow:'hidden' }}>

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background:'linear-gradient(135deg,#b45309,#d97706)' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-2 d-flex align-items-center justify-content-center" style={{ width:42, height:42 }}>
                <Sun size={22} className="text-white"/>
              </div>
              <div>
                <div className="text-white fw-bold" style={{ fontSize:'1rem' }}>{initial ? 'Edit Day Care Record' : 'New Day Care Admission'}</div>
                <div className="text-white small opacity-75">Complete all required sections</div>
              </div>
            </div>
            <button className="btn text-white p-2" style={{ borderRadius:10, border:'1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}><X size={16}/></button>
          </div>

          {/* Tabs */}
          <div className="d-flex border-bottom overflow-auto" style={{ backgroundColor:'#fafaf9', gap:0 }}>
            {TABS.map(t => (
              <button key={t.id} className="btn btn-sm py-3 px-3 border-0 d-flex align-items-center gap-1 rounded-0 flex-shrink-0"
                style={{ fontSize:'0.75rem', fontWeight:600, color:tab===t.id?'#d97706':'#64748b', whiteSpace:'nowrap',
                  borderBottom: tab===t.id?'3px solid #d97706':'3px solid transparent',
                  backgroundColor:'transparent' }}
                onClick={()=>setTab(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 bg-white" style={{ minHeight:380, maxHeight:'55vh', overflowY:'auto' }}>

              {tab==='patient' && <div className="row g-3">
                <F label="Full Name" name="patientName" req half ph="Patient full name"/>
                <F label="UHID / Patient ID" name="uhid" half ph="Unique Hospital ID"/>
                <F label="Age" name="patientAge" half ph="e.g. 45"/>
                <F label="Gender" name="patientGender" opts={['Male','Female','Other']} half/>
                <F label="Phone" name="patientPhone" half ph="+91 9xxxxxxx"/>
                <F label="Address" name="patientAddress" ph="Full address"/>
                <F label="Chief Complaint" name="chiefComplaint" ph="Reason for visit"/>
                <F label="Diagnosis" name="diagnosis" ph="e.g. Acute Gastroenteritis"/>
                <F label="Status" name="status" opts={['Admitted','Under Observation','Discharged','Cancelled']} half/>
              </div>}

              {tab==='admission' && <div className="row g-3">
                <F label="Admission Date" name="admissionDate" type="date" req half/>
                <F label="Admission Time" name="admissionTime" type="time" half/>
                <F label="Bed / Cubicle No." name="bedNumber" half ph="e.g. B-05"/>
                <F label="Ward / Section" name="ward" half ph="e.g. Day Care Ward"/>
                <div className="col-12">
                  <label className="form-label mb-1" style={{ fontSize:'0.72rem', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Notes</label>
                  <textarea className="form-control shadow-none" name="notes" rows={3}
                    style={{ fontSize:'0.85rem', border:'1.5px solid #e2e8f0', borderRadius:8, resize:'none' }}
                    placeholder="General observations..." value={form.notes} onChange={onC}/>
                </div>
              </div>}

              {tab==='staff' && <div className="row g-3">
                <div className="col-12 mb-1">
                  <div className="p-3 rounded-3" style={{ backgroundColor:'#eff6ff', border:'1px solid #bfdbfe' }}>
                    <p className="mb-0 small text-primary fw-semibold">👨‍⚕️ Assign the doctor and nurse responsible for this patient today.</p>
                  </div>
                </div>
                <F label="Doctor Name" name="doctorName" half ph="Dr. Full Name"/>
                <F label="Designation" name="doctorDesignation" half ph="e.g. MBBS, MS Surgery"/>
                <F label="Nurse In Charge" name="nurseInCharge" half ph="Nurse full name"/>
              </div>}

              {tab==='vaccines' && <div>
                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor:'#fdf4ff', border:'1px solid #e9d5ff' }}>
                  <p className="mb-0 small fw-semibold" style={{ color:'#7e22ce' }}>💉 Record all vaccines administered during this day care visit.</p>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <VaccineRows items={form.vaccines} onChange={v=>set('vaccines',v)}/>
                </div>
              </div>}

              {tab==='medications' && <div>
                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor:'#fff7ed', border:'1px solid #fed7aa' }}>
                  <p className="mb-0 small fw-semibold" style={{ color:'#c2410c' }}>💊 Record all medications, IV fluids, or injections given during the visit.</p>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <MedRows items={form.medications} onChange={v=>set('medications',v)}/>
                </div>
              </div>}

              {tab==='procedures' && <div>
                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                  <p className="mb-0 small fw-semibold text-success">🩺 Record all procedures performed today (dressing, blood draw, ECG, etc.).</p>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <ProcRows items={form.procedures} onChange={v=>set('procedures',v)}/>
                </div>
              </div>}

              {tab==='vitals' && <div>
                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor:'#eff6ff', border:'1px solid #bfdbfe' }}>
                  <p className="mb-0 small fw-semibold text-primary">📈 Log vitals at regular intervals throughout the day care visit.</p>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <VitalsRows items={form.vitals} onChange={v=>set('vitals',v)}/>
                </div>
              </div>}

              {tab==='discharge' && <div className="row g-3">
                <div className="col-12 mb-1">
                  <div className="p-3 rounded-3" style={{ backgroundColor:'#d1fae5', border:'1px solid #6ee7b7' }}>
                    <p className="mb-0 small fw-semibold text-success">🏠 Fill this section when the patient is being discharged.</p>
                  </div>
                </div>
                <F label="Discharge Date" name="dischargeDate" type="date" half/>
                <F label="Discharge Time" name="dischargeTime" type="time" half/>
                <F label="Follow-Up Date" name="followUpDate" type="date" half/>
                <div className="col-12">
                  <label className="form-label mb-1" style={{ fontSize:'0.72rem', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Discharge Notes / Instructions</label>
                  <textarea className="form-control shadow-none" name="dischargeNotes" rows={3}
                    style={{ fontSize:'0.85rem', border:'1.5px solid #e2e8f0', borderRadius:8, resize:'none' }}
                    placeholder="Instructions given at discharge..." value={form.dischargeNotes} onChange={onC}/>
                </div>
                <div className="col-12">
                  <label className="form-label mb-1" style={{ fontSize:'0.72rem', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Follow-Up Notes</label>
                  <textarea className="form-control shadow-none" name="followUpNotes" rows={2}
                    style={{ fontSize:'0.85rem', border:'1.5px solid #e2e8f0', borderRadius:8, resize:'none' }}
                    placeholder="What to watch for, next steps..." value={form.followUpNotes} onChange={onC}/>
                </div>
              </div>}

              {tab==='documents' && (
                initial ? (
                  <div className="text-center p-4 rounded-3" style={{ border:'2px dashed #e2e8f0' }}>
                    <FileText size={28} className="text-secondary mb-2 opacity-50"/>
                    <p className="fw-semibold text-dark mb-1">Documents can be uploaded after saving</p>
                    <p className="text-secondary small mb-0">Open the record and use the Upload button in the detail panel.</p>
                  </div>
                ) : (
                  <div>
                    <div className="d-flex flex-column align-items-center justify-content-center rounded-3 mb-4"
                      style={{ border:'2px dashed #e2e8f0', backgroundColor:'#f8fafc', minHeight:140, cursor:'pointer' }}
                      onClick={() => fileRef.current.click()}>
                      <Upload size={26} className="text-secondary mb-2 opacity-50"/>
                      <p className="mb-1 fw-semibold text-dark">Click to attach files</p>
                      <p className="mb-0 text-secondary small">Lab reports, prescriptions, images, etc.</p>
                      <input type="file" multiple ref={fileRef} className="d-none" onChange={e => setPF(p=>[...p,...Array.from(e.target.files)])}/>
                    </div>
                    {pendingFiles.length > 0 && (
                      <div className="d-flex flex-column gap-2">
                        {pendingFiles.map((f,i)=>(
                          <div key={i} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#f8fafc', border:'1px solid #e2e8f0' }}>
                            <FileText size={16} className="text-primary"/>
                            <span className="flex-grow-1 fw-semibold" style={{ fontSize:'0.85rem' }}>{f.name}</span>
                            <span className="text-secondary small">{(f.size/1024).toFixed(1)} KB</span>
                            <button type="button" className="btn btn-sm btn-outline-danger rounded-circle p-1" onClick={()=>setPF(p=>p.filter((_,idx)=>idx!==i))}><X size={12}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ backgroundColor:'#f8fafc' }}>
              <div className="d-flex gap-1">
                {TABS.map(t=>(
                  <div key={t.id} style={{ width:8, height:8, borderRadius:'50%', cursor:'pointer', transition:'all 0.2s',
                    backgroundColor: tab===t.id ? '#d97706' : '#e2e8f0' }}
                    onClick={()=>setTab(t.id)}/>
                ))}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" style={{ fontSize:'0.88rem' }} onClick={onClose}>Cancel</button>
                <button type="submit" disabled={saving} className="btn rounded-pill px-5 fw-bold" style={{ background:'linear-gradient(135deg,#b45309,#d97706)', color:'#fff', border:'none', fontSize:'0.88rem' }}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"/>Saving...</> : initial ? 'Update Record' : 'Admit Patient'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ─── Detail Panel ─────────────────────────────────────────── */
const DetailPanel = ({ rec, onClose, onUpdate, onDelete, onEdit }) => {
  const [uploading, setUploading] = useState(false);
  const [delDoc, setDelDoc]       = useState(null);
  const fileRef = useRef();
  const s = STATUS_CFG[rec.status] || STATUS_CFG['Admitted'];

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploading(true);
    try { let r; for(const f of files) r=await dayCareService.uploadDoc(rec._id,f); if(r) onUpdate(r); }
    catch { alert('Upload failed'); }
    finally { setUploading(false); fileRef.current.value=''; }
  };

  const handleDelDoc = async (docId) => {
    if(!window.confirm('Remove document?')) return;
    setDelDoc(docId);
    try { onUpdate(await dayCareService.deleteDoc(rec._id, docId)); }
    finally { setDelDoc(null); }
  };

  const docIcon = n => {
    const ext = n?.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','webp'].includes(ext)) return '🖼️';
    if(ext==='pdf') return '📄';
    return '📎';
  };

  const Badge = ({count, icon, color, bg, label}) => count>0 && (
    <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ backgroundColor:bg, flex:1, minWidth:80 }}>
      <div style={{ color }}>{icon}</div>
      <div><div className="fw-bold" style={{ fontSize:'1rem', color }}>{count}</div><div style={{ fontSize:'0.65rem', color:'#64748b', whiteSpace:'nowrap' }}>{label}</div></div>
    </div>
  );

  return (
    <div className="d-flex flex-column h-100 bg-white" style={{ borderLeft:'1px solid #e2e8f0' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ background:'linear-gradient(160deg,#b45309,#d97706 80%)' }}>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="text-white fw-bold" style={{ fontSize:'1.05rem' }}>{rec.patientName}</div>
            <div className="text-white opacity-75 small">{rec.patientGender} · {rec.patientAge}yrs {rec.uhid && `· #${rec.uhid}`}</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm bg-white bg-opacity-20 text-white" style={{ borderRadius:8, border:'none', fontSize:'0.75rem' }} onClick={()=>onEdit(rec)}>
              <Edit3 size={12} className="me-1"/>Edit
            </button>
            <button className="btn btn-sm bg-white bg-opacity-20 text-white" style={{ borderRadius:8, border:'none' }} onClick={onClose}><X size={15}/></button>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <span className="badge d-flex align-items-center gap-1 px-3 py-2" style={{ backgroundColor:s.bg, color:s.color, borderRadius:20, fontSize:'0.75rem', fontWeight:700 }}>{s.icon}{rec.status}</span>
          <span className="badge px-3 py-2" style={{ backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:20, fontSize:'0.75rem' }}>{rec.diagnosis||rec.chiefComplaint||'—'}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="d-flex gap-2 px-4 py-3" style={{ backgroundColor:'#fafaf9', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap' }}>
        <Badge count={rec.vaccines?.length} icon={<Shield size={14}/>} color="#7e22ce" bg="#fdf4ff" label="Vaccines"/>
        <Badge count={rec.medications?.length} icon={<Pill size={14}/>} color="#c2410c" bg="#fff7ed" label="Meds"/>
        <Badge count={rec.procedures?.length} icon={<Activity size={14}/>} color="#059669" bg="#f0fdf4" label="Procedures"/>
        <Badge count={rec.vitals?.length} icon={<Heart size={14}/>} color="#3b82f6" bg="#eff6ff" label="Vitals"/>
        <Badge count={rec.documents?.length} icon={<FileText size={14}/>} color="#64748b" bg="#f8fafc" label="Docs"/>
      </div>

      {/* Body */}
      <div className="flex-grow-1 overflow-auto p-4">

        {/* Patient */}
        <SL color="#d97706" label="Patient Info"/>
        <div className="row g-0 mb-3">
          <div className="col-6"><InfoRow label="Phone" value={rec.patientPhone}/></div>
          <div className="col-12"><InfoRow label="Address" value={rec.patientAddress}/></div>
          <div className="col-12"><InfoRow label="Chief Complaint" value={rec.chiefComplaint}/></div>
        </div>

        {/* Admission */}
        <SL color="#3b82f6" label="Admission Details"/>
        <div className="row g-0 mb-3">
          <div className="col-6"><InfoRow label="Admission Date" value={fmt(rec.admissionDate)}/></div>
          <div className="col-6"><InfoRow label="Time" value={rec.admissionTime}/></div>
          <div className="col-6"><InfoRow label="Bed" value={rec.bedNumber}/></div>
          <div className="col-6"><InfoRow label="Ward" value={rec.ward}/></div>
        </div>

        {/* Staff */}
        <SL color="#8b5cf6" label="Assigned Staff"/>
        <div className="d-flex gap-2 flex-wrap mb-4">
          {rec.doctorName && (
            <div className="d-flex align-items-center gap-2 p-3 rounded-3 flex-grow-1" style={{ backgroundColor:'#eff6ff', border:'1px solid #bfdbfe' }}>
              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style={{ width:36, height:36, backgroundColor:'#3b82f6', fontSize:'0.85rem' }}>{rec.doctorName.charAt(0)}</div>
              <div><div className="fw-bold text-dark" style={{ fontSize:'0.85rem' }}>Dr. {rec.doctorName}</div><div className="text-secondary" style={{ fontSize:'0.72rem' }}>{rec.doctorDesignation||'Doctor'}</div></div>
            </div>
          )}
          {rec.nurseInCharge && (
            <div className="d-flex align-items-center gap-2 p-3 rounded-3 flex-grow-1" style={{ backgroundColor:'#fdf4ff', border:'1px solid #e9d5ff' }}>
              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style={{ width:36, height:36, backgroundColor:'#8b5cf6', fontSize:'0.85rem' }}>{rec.nurseInCharge.charAt(0)}</div>
              <div><div className="fw-bold text-dark" style={{ fontSize:'0.85rem' }}>{rec.nurseInCharge}</div><div className="text-secondary" style={{ fontSize:'0.72rem' }}>Nurse In Charge</div></div>
            </div>
          )}
        </div>

        {/* Vaccines */}
        {rec.vaccines?.length > 0 && <>
          <SL color="#7e22ce" label="Vaccines Administered"/>
          <div className="mb-4 d-flex flex-column gap-2">
            {rec.vaccines.map((v,i)=>(
              <div key={i} className="p-3 rounded-3" style={{ backgroundColor:'#fdf4ff', border:'1px solid #e9d5ff' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark" style={{ fontSize:'0.88rem' }}>💉 {v.vaccineName}</span>
                  <span className="badge px-2" style={{ backgroundColor:'#7e22ce', color:'#fff', fontSize:'0.7rem' }}>{v.route}</span>
                </div>
                <div className="d-flex flex-wrap gap-3 mt-2 text-secondary" style={{ fontSize:'0.75rem' }}>
                  {v.dose && <span>Dose: <strong>{v.dose}</strong></span>}
                  {v.batchNumber && <span>Batch: <strong>{v.batchNumber}</strong></span>}
                  {v.site && <span>Site: <strong>{v.site}</strong></span>}
                  {v.givenBy && <span>By: <strong>{v.givenBy}</strong></span>}
                  {v.givenAt && <span>{fmtDt(v.givenAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* Medications */}
        {rec.medications?.length > 0 && <>
          <SL color="#c2410c" label="Medications Given"/>
          <div className="mb-4 d-flex flex-column gap-2">
            {rec.medications.map((m,i)=>(
              <div key={i} className="p-3 rounded-3" style={{ backgroundColor:'#fff7ed', border:'1px solid #fed7aa' }}>
                <div className="d-flex justify-content-between">
                  <span className="fw-bold text-dark" style={{ fontSize:'0.88rem' }}>💊 {m.name}</span>
                  <span className="badge px-2" style={{ backgroundColor:'#c2410c', color:'#fff', fontSize:'0.7rem' }}>{m.route}</span>
                </div>
                <div className="d-flex flex-wrap gap-3 mt-2 text-secondary" style={{ fontSize:'0.75rem' }}>
                  {m.dosage && <span>Dose: <strong>{m.dosage}</strong></span>}
                  {m.frequency && <span>Freq: <strong>{m.frequency}</strong></span>}
                  {m.givenBy && <span>By: <strong>{m.givenBy}</strong></span>}
                  {m.givenAt && <span>{fmtDt(m.givenAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* Procedures */}
        {rec.procedures?.length > 0 && <>
          <SL color="#059669" label="Procedures"/>
          <div className="mb-4 d-flex flex-column gap-2">
            {rec.procedures.map((p,i)=>(
              <div key={i} className="p-3 rounded-3" style={{ backgroundColor:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                <div className="fw-bold text-dark" style={{ fontSize:'0.88rem' }}>🩺 {p.name}</div>
                {p.description && <div className="text-secondary small mt-1">{p.description}</div>}
                <div className="d-flex flex-wrap gap-3 mt-1 text-secondary" style={{ fontSize:'0.75rem' }}>
                  {p.performedBy && <span>By: <strong>{p.performedBy}</strong></span>}
                  {p.performedAt && <span>{fmtDt(p.performedAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* Vitals */}
        {rec.vitals?.length > 0 && <>
          <SL color="#3b82f6" label="Vitals Monitoring"/>
          <div className="mb-4" style={{ overflowX:'auto' }}>
            <table className="table table-sm table-bordered" style={{ fontSize:'0.78rem', minWidth:500 }}>
              <thead style={{ backgroundColor:'#eff6ff' }}>
                <tr><th>Time</th><th>BP</th><th>Pulse</th><th>Temp</th><th>SpO2</th><th>RBS</th><th>Wt</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {rec.vitals.map((v,i)=>(
                  <tr key={i}>
                    <td>{fmtDt(v.recordedAt)}</td>
                    <td>{v.bp||'—'}</td><td>{v.pulse||'—'}</td>
                    <td>{v.temperature||'—'}</td><td>{v.spO2||'—'}</td>
                    <td>{v.rbs||'—'}</td><td>{v.weight||'—'}</td>
                    <td>{v.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* Discharge */}
        {rec.dischargeDate && <>
          <SL color="#059669" label="Discharge Info"/>
          <div className="p-3 rounded-3 mb-4" style={{ backgroundColor:'#d1fae5', border:'1px solid #6ee7b7' }}>
            <div className="row g-0">
              <div className="col-6"><InfoRow label="Discharge Date" value={fmt(rec.dischargeDate)}/></div>
              <div className="col-6"><InfoRow label="Time" value={rec.dischargeTime}/></div>
              {rec.followUpDate && <div className="col-6"><InfoRow label="Follow-Up" value={fmt(rec.followUpDate)}/></div>}
              {rec.dischargeNotes && <div className="col-12"><InfoRow label="Instructions" value={rec.dischargeNotes}/></div>}
              {rec.followUpNotes && <div className="col-12"><InfoRow label="Follow-Up Notes" value={rec.followUpNotes}/></div>}
            </div>
          </div>
        </>}

        {/* Documents */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <SL color="#0369a1" label={`Documents (${rec.documents?.length||0})`}/>
          <button className="btn btn-sm fw-semibold d-flex align-items-center gap-1 ms-2" style={{ backgroundColor:'#d97706', color:'#fff', borderRadius:8, border:'none', fontSize:'0.78rem', flexShrink:0 }}
            onClick={()=>fileRef.current.click()} disabled={uploading}>
            {uploading?<Loader size={12} className="spin"/>:<Upload size={12}/>} Upload
          </button>
          <input type="file" multiple ref={fileRef} className="d-none" onChange={handleUpload}/>
        </div>

        {(!rec.documents||rec.documents.length===0) ? (
          <div className="d-flex flex-column align-items-center py-4 rounded-3" style={{ border:'2px dashed #e2e8f0', cursor:'pointer' }} onClick={()=>fileRef.current.click()}>
            <Upload size={22} className="text-secondary opacity-50 mb-2"/>
            <span className="text-secondary small">Click Upload to attach files</span>
          </div>
        ):(
          <div className="d-flex flex-column gap-2">
            {rec.documents.map(doc=>(
              <div key={doc._id} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#f8fafc', border:'1px solid #e2e8f0' }}>
                <span style={{ fontSize:'1.2rem' }}>{docIcon(doc.fileName)}</span>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="fw-semibold text-dark text-truncate" style={{ fontSize:'0.82rem' }}>{doc.fileName}</div>
                  <div className="text-secondary" style={{ fontSize:'0.7rem' }}>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</div>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm p-1 rounded-circle" style={{ border:'1px solid #3b82f6', color:'#3b82f6' }}><ExternalLink size={12}/></a>
                <button className="btn btn-sm p-1 rounded-circle" style={{ border:'1px solid #ef4444', color:'#ef4444' }} disabled={delDoc===doc._id} onClick={()=>handleDelDoc(doc._id)}>
                  {delDoc===doc._id?<Loader size={12}/>:<Trash2 size={12}/>}
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline-danger btn-sm w-100 mt-4 rounded-pill" onClick={()=>onDelete(rec._id)}>
          <Trash2 size={13} className="me-1"/>Delete Record
        </button>
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────── */
export default function DayCarePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sFilter, setSFilter] = useState('All');
  const [showModal, setModal] = useState(false);
  const [editRec, setEdit]    = useState(null);
  const [detail, setDetail]   = useState(null);

  const load = async () => { setLoading(true); try { setRecords(await dayCareService.getAll()); } finally { setLoading(false); } };
  useEffect(()=>{ load(); },[]);

  // Real-time sync via WebSocket
  useWebSocket({ DAYCARE_UPDATED: () => load() });

  const handleSave = async (form) => {
    let rec;
    if (editRec) {
      rec = await dayCareService.update(editRec._id, form);
      setRecords(r=>r.map(x=>x._id===rec._id?rec:x));
      if(detail?._id===rec._id) setDetail(rec);
    } else {
      rec = await dayCareService.create(form);
      setRecords(r=>[rec,...r]);
    }
    setModal(false); setEdit(null);
    return rec;
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this record?')) return;
    await dayCareService.delete(id);
    setRecords(r=>r.filter(x=>x._id!==id));
    if(detail?._id===id) setDetail(null);
  };

  const handleUpdate = u => { setRecords(r=>r.map(x=>x._id===u._id?u:x)); setDetail(u); };

  const filtered = records.filter(r=>{
    const q=search.toLowerCase();
    return (!q||[r.patientName,r.doctorName,r.diagnosis,r.chiefComplaint,r.uhid].some(v=>v?.toLowerCase().includes(q)))
      && (sFilter==='All'||r.status===sFilter);
  });

  const st = { total:records.length, admitted:records.filter(r=>r.status==='Admitted').length, obs:records.filter(r=>r.status==='Under Observation').length, disc:records.filter(r=>r.status==='Discharged').length };

  return (
    <div className="d-flex flex-column" style={{ minHeight:'100vh', backgroundColor:'#fafaf9' }}>
      <Navbar/>

      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,#92400e 0%,#b45309 50%,#d97706 100%)', padding:'24px 32px 28px' }}>
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center" style={{ width:52,height:52 }}>
              <Sun size={26} className="text-white"/>
            </div>
            <div>
              <h4 className="text-white fw-black mb-0" style={{ letterSpacing:'-0.5px' }}>Day Care</h4>
              <div className="text-white small opacity-75">Short-stay patient care · Treatments · Vaccines · Monitoring</div>
            </div>
          </div>
          <button className="btn fw-bold rounded-pill px-4 d-flex align-items-center gap-2 shadow"
            style={{ backgroundColor:'#fff', color:'#b45309', fontSize:'0.88rem' }}
            onClick={()=>{ setEdit(null); setModal(true); }}>
            <Plus size={18}/> Admit Patient
          </button>
        </div>
        <div className="d-flex gap-3 mt-4 flex-wrap">
          {[['Total',st.total,'#d97706'],['Admitted',st.admitted,'#3b82f6'],['Observing',st.obs,'#d97706'],['Discharged',st.disc,'#059669']].map(([l,v,c])=>(
            <div key={l} className="text-center p-3 rounded-3" style={{ backgroundColor:'rgba(255,255,255,0.92)', minWidth:90, flex:1 }}>
              <div className="fw-black" style={{ fontSize:'1.7rem', color:c, lineHeight:1 }}>{v}</div>
              <div className="small fw-semibold mt-1" style={{ color:'#64748b' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight:0 }}>
        <div className="d-flex flex-column overflow-hidden" style={{ flex:detail?'0 0 55%':'1 1 100%', transition:'flex 0.3s', minWidth:0 }}>
          {/* Filter bar */}
          <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white flex-wrap" style={{ borderBottom:'1px solid #e2e8f0' }}>
            <div className="position-relative" style={{ minWidth:220, flex:1, maxWidth:320 }}>
              <Search size={14} className="position-absolute text-secondary" style={{ top:'50%', left:12, transform:'translateY(-50%)' }}/>
              <input className="form-control shadow-none" style={{ paddingLeft:'2.1rem', borderRadius:24, border:'1.5px solid #e2e8f0', fontSize:'0.85rem' }}
                placeholder="Search patient, doctor..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="d-flex gap-1 flex-wrap">
              {['All','Admitted','Under Observation','Discharged','Cancelled'].map(s=>(
                <button key={s} className="btn btn-sm rounded-pill px-3"
                  style={{ fontSize:'0.75rem', fontWeight:600, backgroundColor:sFilter===s?'#d97706':'transparent',
                    color:sFilter===s?'#fff':'#64748b', border:sFilter===s?'1.5px solid #d97706':'1.5px solid #e2e8f0' }}
                  onClick={()=>setSFilter(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="flex-grow-1 overflow-auto p-4">
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5"><Loader size={28} className="spin" style={{ color:'#d97706' }}/></div>
            ) : filtered.length===0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize:'3rem' }} className="mb-3">☀️</div>
                <h6 className="fw-bold text-dark">No Records Found</h6>
                <p className="text-secondary small">Click "Admit Patient" to create a day care record.</p>
              </div>
            ) : (
              <div className={detail ? 'd-flex flex-column gap-3' : 'row g-3'}>
                {filtered.map(rec=>{
                  const s=STATUS_CFG[rec.status]||STATUS_CFG['Admitted'];
                  const sel=detail?._id===rec._id;
                  return (
                    <div key={rec._id} className={detail?'':'col-xl-4 col-lg-6 col-md-6'}>
                      <div className="card border-0 shadow-sm h-100"
                        style={{ borderRadius:14, cursor:'pointer', outline:sel?'2px solid #d97706':'none', transition:'all 0.18s' }}
                        onMouseEnter={e=>!sel&&(e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)')}
                        onMouseLeave={e=>!sel&&(e.currentTarget.style.boxShadow='')}
                        onClick={()=>setDetail(rec)}>
                        <div style={{ height:4, background:s.color, borderRadius:'14px 14px 0 0' }}></div>
                        <div className="p-3">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div>
                              <div className="fw-bold text-dark" style={{ fontSize:'0.92rem' }}>{rec.patientName}</div>
                              <div className="text-secondary" style={{ fontSize:'0.75rem' }}>
                                {rec.patientAge?`${rec.patientAge} yrs`:''}{rec.patientGender?` · ${rec.patientGender}`:''}{rec.uhid?` · #${rec.uhid}`:''}
                              </div>
                            </div>
                            <span className="badge d-flex align-items-center gap-1 px-2 py-1 rounded-pill" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>
                              {s.icon}{rec.status}
                            </span>
                          </div>

                          {rec.diagnosis && <div className="text-secondary mb-2" style={{ fontSize:'0.8rem' }}>📋 {rec.diagnosis}</div>}

                          <div className="d-flex align-items-center gap-2 mb-2 text-secondary" style={{ fontSize:'0.75rem' }}>
                            <Calendar size={11}/> {fmt(rec.admissionDate)} {rec.bedNumber && <><span>·</span><span>Bed {rec.bedNumber}</span></>}
                          </div>

                          {/* Mini badges */}
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {rec.vaccines?.length>0 && <span className="badge px-2" style={{ backgroundColor:'#fdf4ff', color:'#7e22ce', fontSize:'0.68rem' }}>💉 {rec.vaccines.length} Vaccine{rec.vaccines.length>1?'s':''}</span>}
                            {rec.medications?.length>0 && <span className="badge px-2" style={{ backgroundColor:'#fff7ed', color:'#c2410c', fontSize:'0.68rem' }}>💊 {rec.medications.length} Med{rec.medications.length>1?'s':''}</span>}
                            {rec.procedures?.length>0 && <span className="badge px-2" style={{ backgroundColor:'#f0fdf4', color:'#059669', fontSize:'0.68rem' }}>🩺 {rec.procedures.length} Proc</span>}
                            {rec.documents?.length>0 && <span className="badge px-2" style={{ backgroundColor:'#f8fafc', color:'#64748b', fontSize:'0.68rem' }}>📎 {rec.documents.length}</span>}
                          </div>

                          {rec.doctorName && (
                            <div className="d-flex align-items-center gap-2 pt-2" style={{ borderTop:'1px solid #f1f5f9' }}>
                              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width:26, height:26, backgroundColor:'#3b82f6', fontSize:'0.7rem' }}>
                                {rec.doctorName.charAt(0)}
                              </div>
                              <span className="text-dark fw-semibold" style={{ fontSize:'0.78rem' }}>Dr. {rec.doctorName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {detail && (
          <div style={{ flex:'0 0 45%', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <DetailPanel rec={detail} onClose={()=>setDetail(null)} onUpdate={handleUpdate} onDelete={handleDelete} onEdit={r=>{setEdit(r);setModal(true);}}/>
          </div>
        )}
      </div>

      {showModal && <RecordModal initial={editRec} onSave={handleSave} onClose={()=>{setModal(false);setEdit(null);}}/>}

      <style>{`
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fw-black{font-weight:900!important}
      `}</style>
    </div>
  );
}
