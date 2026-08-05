import React, { useState, useEffect, useRef } from 'react';
import homeCareService from '../../services/homeCareService';
import Navbar from '../../components/Navbar';
import {
  Plus, Home, User, Calendar, Clock, FileText, Upload, Trash2,
  CheckCircle, XCircle, AlertCircle, Loader, Search, Edit3, X,
  Phone, MapPin, Stethoscope, Activity, ExternalLink, ChevronRight,
  Heart, Shield, Clipboard
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  'Scheduled':  { color: '#3b82f6', bg: '#dbeafe', icon: <Calendar size={11} /> },
  'In Progress':{ color: '#d97706', bg: '#fef3c7', icon: <Activity size={11} /> },
  'Completed':  { color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={11} /> },
  'Cancelled':  { color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={11} /> },
};

const SERVICE_TYPES   = ['Nursing Care','Physiotherapy','Doctor Visit','Lab Collection','Wound Dressing','IV Infusion','Post-Surgery Care','Elderly Care','Other'];
const PERFORMER_ROLES = ['Nurse','Doctor','Physiotherapist','Lab Technician','Caregiver','Other'];
const FREQUENCIES     = ['Once','Daily','Alternate Days','Weekly','Monthly'];

const EMPTY = {
  patientName:'', patientAge:'', patientGender:'Male', patientPhone:'',
  patientAddress:'', diagnosis:'', serviceType:'Nursing Care',
  serviceDescription:'', startDate:'', endDate:'', frequency:'Daily',
  timeSlot:'', performerName:'', performerRole:'Nurse', performerPhone:'',
  visitedBy:'', visitedByRole:'', visitedAt:'',
  status:'Scheduled', notes:''
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

/* ─── SectionHeader ─────────────────────────────────────────────── */
const SectionHead = ({ icon, label, color }) => (
  <div className="d-flex align-items-center gap-2 mb-3">
    <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width:30, height:30, backgroundColor: color+'15' }}>
      {React.cloneElement(icon, { size:15, style:{ color } })}
    </div>
    <span className="fw-bold" style={{ fontSize:'0.85rem', color:'#1e293b' }}>{label}</span>
    <div className="flex-grow-1" style={{ height:1, backgroundColor:'#e2e8f0' }}></div>
  </div>
);

/* ─── Form Field ────────────────────────────────────────────────── */
const Field = ({ label, name, type='text', options, required, placeholder, half, form, onChange }) => (
  <div className={half ? 'col-md-6' : 'col-12'}>
    <label className="form-label mb-1" style={{ fontSize:'0.78rem', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.3px' }}>
      {label}{required && <span className="text-danger ms-1">*</span>}
    </label>
    {options ? (
      <select
        className="form-select shadow-none"
        style={{ fontSize:'0.88rem', border:'1.5px solid #e2e8f0', borderRadius:8 }}
        name={name} value={form[name]} onChange={onChange} required={required}
      >
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    ) : (
      <input
        className="form-control shadow-none"
        style={{ fontSize:'0.88rem', border:'1.5px solid #e2e8f0', borderRadius:8 }}
        type={type} name={name} value={form[name]} onChange={onChange}
        required={required} placeholder={placeholder}
      />
    )}
  </div>
);

/* ─── Create / Edit Modal ───────────────────────────────────────── */
const RecordModal = ({ initial, onSave, onClose }) => {
  const [form, setForm]       = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  const fileRef = useRef();

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const pickFile = (e) => {
    const files = Array.from(e.target.files);
    setPendingFiles(p => [...p, ...files]);
    fileRef.current.value = '';
  };

  const removeFile = (i) => setPendingFiles(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const record = await onSave(form);
      // Upload any pending files
      if (record && pendingFiles.length > 0) {
        for (const f of pendingFiles) {
          await homeCareService.uploadDocument(record._id, f);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const fp = { form, onChange };

  const tabs = [
    { id:'patient',   label:'Patient',   icon:<User size={14}/> },
    { id:'service',   label:'Service',   icon:<Stethoscope size={14}/> },
    { id:'caregiver', label:'Caregiver', icon:<Heart size={14}/> },
    { id:'visitor',   label:'Visitor',   icon:<MapPin size={14}/> },
    { id:'documents', label:'Documents', icon:<FileText size={14}/> },
  ];

  return (
    <div className="modal d-block" style={{ backgroundColor:'rgba(15,23,42,0.65)', zIndex:1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth:700 }}>
        <div className="modal-content border-0 shadow" style={{ borderRadius:16, overflow:'hidden' }}>

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background:'linear-gradient(135deg,#0f766e,#0d9488)' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-2 d-flex align-items-center justify-content-center" style={{ width:40, height:40 }}>
                <Home size={20} className="text-white" />
              </div>
              <div>
                <div className="text-white fw-bold" style={{ fontSize:'1rem' }}>{initial ? 'Edit Home Care Record' : 'New Home Care Record'}</div>
                <div className="text-white small opacity-75">Complete all required sections</div>
              </div>
            </div>
            <button className="btn text-white p-2" style={{ borderRadius:10, border:'1.5px solid rgba(255,255,255,0.3)' }} onClick={onClose}><X size={16}/></button>
          </div>

          {/* Tab Navigation */}
          <div className="d-flex border-bottom px-4" style={{ backgroundColor:'#f8fafc', gap:2 }}>
            {tabs.map(t => (
              <button key={t.id} className="btn btn-sm py-3 px-3 border-0 d-flex align-items-center gap-2 rounded-0"
                style={{ fontSize:'0.8rem', fontWeight:600, color: activeTab===t.id ? '#0d9488' : '#64748b',
                  borderBottom: activeTab===t.id ? '3px solid #0d9488' : '3px solid transparent',
                  backgroundColor:'transparent', transition:'all 0.2s' }}
                onClick={() => setActiveTab(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4" style={{ backgroundColor:'#fff', minHeight:350 }}>

              {/* Patient Tab */}
              {activeTab === 'patient' && (
                <div className="row g-3">
                  <Field label="Patient Full Name" name="patientName" required half placeholder="e.g. Raj Kumar" {...fp} />
                  <Field label="Age" name="patientAge" half placeholder="e.g. 65" {...fp} />
                  <Field label="Gender" name="patientGender" options={['Male','Female','Other']} half {...fp} />
                  <Field label="Phone Number" name="patientPhone" half placeholder="+91 9xxxxxxx" {...fp} />
                  <Field label="Home Address" name="patientAddress" placeholder="Full address where care will be given" {...fp} />
                  <Field label="Diagnosis / Condition" name="diagnosis" placeholder="e.g. Post-op recovery, Diabetes management" {...fp} />
                </div>
              )}

              {/* Service Tab */}
              {activeTab === 'service' && (
                <div className="row g-3">
                  <Field label="Service Type" name="serviceType" options={SERVICE_TYPES} half required {...fp} />
                  <Field label="Frequency" name="frequency" options={FREQUENCIES} half {...fp} />
                  <Field label="Start Date" name="startDate" type="date" half required {...fp} />
                  <Field label="End Date" name="endDate" type="date" half {...fp} />
                  <Field label="Preferred Time Slot" name="timeSlot" half placeholder="e.g. 9:00 AM – 10:00 AM" {...fp} />
                  <Field label="Status" name="status" options={['Scheduled','In Progress','Completed','Cancelled']} half {...fp} />
                  <div className="col-12">
                    <label className="form-label mb-1" style={{ fontSize:'0.78rem', fontWeight:600, color:'#64748b', textTransform:'uppercase' }}>Service Description</label>
                    <textarea className="form-control shadow-none" name="serviceDescription" rows={3}
                      style={{ fontSize:'0.88rem', border:'1.5px solid #e2e8f0', borderRadius:8, resize:'none' }}
                      placeholder="Describe the care required..." value={form.serviceDescription} onChange={onChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label mb-1" style={{ fontSize:'0.78rem', fontWeight:600, color:'#64748b', textTransform:'uppercase' }}>Additional Notes</label>
                    <textarea className="form-control shadow-none" name="notes" rows={2}
                      style={{ fontSize:'0.88rem', border:'1.5px solid #e2e8f0', borderRadius:8, resize:'none' }}
                      placeholder="Allergies, special instructions, etc." value={form.notes} onChange={onChange} />
                  </div>
                </div>
              )}

              {/* Caregiver Tab */}
              {activeTab === 'caregiver' && (
                <div className="row g-3">
                  <div className="col-12 mb-1">
                    <div className="p-3 rounded-3" style={{ backgroundColor:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                      <p className="mb-0 small text-success fw-semibold">👤 Assigned Caregiver — the person responsible for this case</p>
                    </div>
                  </div>
                  <Field label="Caregiver Name" name="performerName" required half placeholder="Full name" {...fp} />
                  <Field label="Role / Designation" name="performerRole" options={PERFORMER_ROLES} half {...fp} />
                  <Field label="Caregiver Phone" name="performerPhone" half placeholder="+91 9xxxxxxx" {...fp} />
                </div>
              )}

              {/* Visitor Tab */}
              {activeTab === 'visitor' && (
                <div className="row g-3">
                  <div className="col-12 mb-1">
                    <div className="p-3 rounded-3" style={{ backgroundColor:'#fff7ed', border:'1px solid #fed7aa' }}>
                      <p className="mb-0 small fw-semibold" style={{ color:'#ea580c' }}>🚗 Who actually went for this home visit? Record the visit details here.</p>
                    </div>
                  </div>
                  <Field label="Visited By (Name)" name="visitedBy" half placeholder="Name of person who visited" {...fp} />
                  <Field label="Their Role" name="visitedByRole" options={['', ...PERFORMER_ROLES]} half {...fp} />
                  <Field label="Visit Date & Time" name="visitedAt" type="datetime-local" half {...fp} />
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div>
                  {initial ? (
                    <div className="p-3 rounded-3 text-center" style={{ backgroundColor:'#f0fdf4', border:'1px dashed #6ee7b7' }}>
                      <CheckCircle size={22} className="text-success mb-2" />
                      <p className="mb-0 small text-success fw-semibold">Documents can be uploaded after saving. Open the record and use the Upload button in the detail panel.</p>
                    </div>
                  ) : (
                    <>
                      <div
                        className="d-flex flex-column align-items-center justify-content-center rounded-3 mb-4"
                        style={{ border:'2px dashed #cbd5e1', backgroundColor:'#f8fafc', minHeight:160, cursor:'pointer' }}
                        onClick={() => fileRef.current.click()}
                      >
                        <Upload size={28} className="text-secondary mb-2 opacity-50" />
                        <p className="mb-1 fw-semibold text-dark">Click to attach files</p>
                        <p className="mb-0 text-secondary small">PDF, Images, Reports, etc.</p>
                        <input type="file" multiple ref={fileRef} className="d-none" onChange={pickFile} />
                      </div>

                      {pendingFiles.length > 0 && (
                        <div className="d-flex flex-column gap-2">
                          <p className="fw-bold text-secondary small mb-1">{pendingFiles.length} file(s) ready to upload</p>
                          {pendingFiles.map((f, i) => (
                            <div key={i} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              <FileText size={18} className="text-primary flex-shrink-0" />
                              <span className="flex-grow-1 fw-semibold text-dark" style={{ fontSize:'0.85rem' }}>{f.name}</span>
                              <span className="text-secondary small">{(f.size/1024).toFixed(1)} KB</span>
                              <button type="button" className="btn btn-sm btn-outline-danger rounded-circle p-1" onClick={() => removeFile(i)}><X size={12}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ backgroundColor:'#f8fafc' }}>
              <div className="d-flex gap-1">
                {tabs.map(t => (
                  <div key={t.id} style={{ width:8, height:8, borderRadius:'50%', backgroundColor: activeTab===t.id ? '#0d9488' : '#cbd5e1', cursor:'pointer', transition:'all 0.2s' }}
                    onClick={() => setActiveTab(t.id)} />
                ))}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" style={{ fontSize:'0.88rem' }} onClick={onClose}>Cancel</button>
                <button type="submit" disabled={saving} className="btn rounded-pill px-5 fw-bold" style={{ background:'linear-gradient(135deg,#0f766e,#0d9488)', color:'#fff', border:'none', fontSize:'0.88rem' }}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : initial ? 'Update Record' : 'Create Record'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ─── Detail Side Panel ──────────────────────────────────────────── */
const DetailPanel = ({ record, onClose, onUpdate, onDelete, onEdit }) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const fileRef = useRef();
  const s = STATUS_CONFIG[record.status] || STATUS_CONFIG['Scheduled'];

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      let updated;
      for (const f of files) {
        updated = await homeCareService.uploadDocument(record._id, f);
      }
      if (updated) onUpdate(updated);
    } catch { alert('Upload failed'); }
    finally { setUploading(false); fileRef.current.value=''; }
  };

  const handleDelDoc = async (docId) => {
    if (!window.confirm('Remove this document?')) return;
    setDeleting(docId);
    try { onUpdate(await homeCareService.deleteDocument(record._id, docId)); }
    finally { setDeleting(null); }
  };

  const docIcon = (name) => {
    const ext = name?.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','webp','gif'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    return '📎';
  };

  const InfoItem = ({ label, value, icon }) => (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-1 mb-1" style={{ color:'#94a3b8', fontSize:'0.7rem', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.5px' }}>
        {icon && React.cloneElement(icon,{size:10,style:{color:'#94a3b8'}})} {label}
      </div>
      <div className="fw-semibold text-dark" style={{ fontSize:'0.88rem' }}>{value || <span className="text-secondary fst-italic">Not provided</span>}</div>
    </div>
  );

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor:'#fff', borderLeft:'1px solid #e2e8f0' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ background:'linear-gradient(160deg,#0f766e,#0d9488 80%)' }}>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="text-white fw-bold" style={{ fontSize:'1.05rem' }}>{record.patientName}</div>
            <div className="text-white small opacity-75">{record.patientGender} · {record.patientAge ? `${record.patientAge} yrs` : '—'}</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm bg-white bg-opacity-20 text-white" style={{ borderRadius:8, fontSize:'0.75rem', border:'none' }} onClick={() => onEdit(record)}>
              <Edit3 size={13} className="me-1"/>Edit
            </button>
            <button className="btn btn-sm bg-white bg-opacity-20 text-white" style={{ borderRadius:8, border:'none' }} onClick={onClose}><X size={15}/></button>
          </div>
        </div>

        {/* Status + Service */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="badge d-flex align-items-center gap-1 px-3 py-2 fw-semibold" style={{ backgroundColor: s.bg, color: s.color, borderRadius:20, fontSize:'0.75rem' }}>
            {s.icon} {record.status}
          </span>
          <span className="badge px-3 py-2 fw-semibold" style={{ backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:20, fontSize:'0.75rem' }}>
            {record.serviceType}
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow-1 overflow-auto">
        <div className="p-4">
          {/* Patient */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width:3, height:16, backgroundColor:'#0d9488', borderRadius:2 }}></div>
              <span className="fw-bold text-dark" style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Patient Info</span>
            </div>
            <div className="row g-0">
              <div className="col-6"><InfoItem label="Phone" value={record.patientPhone} icon={<Phone/>}/></div>
              <div className="col-12"><InfoItem label="Address" value={record.patientAddress} icon={<MapPin/>}/></div>
              <div className="col-12"><InfoItem label="Diagnosis" value={record.diagnosis} icon={<AlertCircle/>}/></div>
            </div>
          </div>

          {/* Schedule */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width:3, height:16, backgroundColor:'#3b82f6', borderRadius:2 }}></div>
              <span className="fw-bold text-dark" style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Schedule</span>
            </div>
            <div className="row g-0">
              <div className="col-6"><InfoItem label="Start Date" value={fmt(record.startDate)} icon={<Calendar/>}/></div>
              <div className="col-6"><InfoItem label="End Date" value={fmt(record.endDate)} icon={<Calendar/>}/></div>
              <div className="col-6"><InfoItem label="Frequency" value={record.frequency} icon={<Clock/>}/></div>
              <div className="col-6"><InfoItem label="Time Slot" value={record.timeSlot} icon={<Clock/>}/></div>
            </div>
            {record.serviceDescription && <InfoItem label="Description" value={record.serviceDescription}/>}
            {record.notes && <InfoItem label="Notes" value={record.notes}/>}
          </div>

          {/* Caregiver */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width:3, height:16, backgroundColor:'#8b5cf6', borderRadius:2 }}></div>
              <span className="fw-bold text-dark" style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Assigned Caregiver</span>
            </div>
            <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#faf5ff', border:'1px solid #e9d5ff' }}>
              <div className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0" style={{ width:40, height:40, backgroundColor:'#8b5cf6', fontSize:'0.9rem' }}>
                {record.performerName?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="fw-bold text-dark" style={{ fontSize:'0.9rem' }}>{record.performerName}</div>
                <div className="text-secondary small">{record.performerRole}</div>
                {record.performerPhone && <div className="small mt-1" style={{ color:'#8b5cf6' }}>{record.performerPhone}</div>}
              </div>
            </div>
          </div>

          {/* Visitor */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width:3, height:16, backgroundColor:'#ea580c', borderRadius:2 }}></div>
              <span className="fw-bold text-dark" style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Who Went for Visit</span>
            </div>
            {record.visitedBy ? (
              <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#fff7ed', border:'1px solid #fed7aa' }}>
                <div className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0" style={{ width:40, height:40, backgroundColor:'#ea580c', fontSize:'0.9rem' }}>
                  {record.visitedBy.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize:'0.9rem' }}>{record.visitedBy}</div>
                  {record.visitedByRole && <div className="text-secondary small">{record.visitedByRole}</div>}
                  {record.visitedAt && (
                    <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize:'0.75rem', color:'#ea580c' }}>
                      <Calendar size={10}/> {fmtDt(record.visitedAt)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 rounded-3" style={{ backgroundColor:'#f8fafc', border:'1px dashed #e2e8f0' }}>
                <span className="text-secondary small">No visit recorded yet</span>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width:3, height:16, backgroundColor:'#0369a1', borderRadius:2 }}></div>
                <span className="fw-bold text-dark" style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Documents ({record.documents?.length || 0})
                </span>
              </div>
              <button
                className="btn btn-sm d-flex align-items-center gap-1 fw-semibold"
                style={{ backgroundColor:'#0d9488', color:'#fff', borderRadius:8, border:'none', fontSize:'0.78rem' }}
                onClick={() => fileRef.current.click()} disabled={uploading}
              >
                {uploading ? <Loader size={12} className="spin"/> : <Upload size={12}/>} Upload
              </button>
              <input type="file" multiple ref={fileRef} className="d-none" onChange={handleUpload}/>
            </div>

            {(!record.documents || record.documents.length === 0) ? (
              <div
                className="d-flex flex-column align-items-center justify-content-center rounded-3 py-4"
                style={{ border:'2px dashed #e2e8f0', cursor:'pointer', backgroundColor:'#fafafa' }}
                onClick={() => fileRef.current.click()}
              >
                <Upload size={22} className="text-secondary opacity-50 mb-2"/>
                <span className="text-secondary small">Drop files or click Upload</span>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {record.documents.map(doc => (
                  <div key={doc._id} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor:'#f8fafc', border:'1px solid #e2e8f0' }}>
                    <span style={{ fontSize:'1.3rem' }}>{docIcon(doc.fileName)}</span>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" style={{ fontSize:'0.82rem' }}>{doc.fileName}</div>
                      <div className="text-secondary" style={{ fontSize:'0.7rem' }}>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm p-1 rounded-circle" style={{ border:'1px solid #3b82f6', color:'#3b82f6' }} title="View"><ExternalLink size={13}/></a>
                    <button className="btn btn-sm p-1 rounded-circle" style={{ border:'1px solid #ef4444', color:'#ef4444' }} disabled={deleting===doc._id} onClick={() => handleDelDoc(doc._id)}>
                      {deleting===doc._id ? <Loader size={13}/> : <Trash2 size={13}/>}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Delete record */}
            <button className="btn btn-outline-danger btn-sm w-100 mt-4 rounded-pill" onClick={() => onDelete(record._id)}>
              <Trash2 size={13} className="me-1"/> Delete This Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────── */
const HomeCarePage = () => {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [detail, setDetail]       = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRecords(await homeCareService.getAll()); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editRecord) {
      const updated = await homeCareService.update(editRecord._id, form);
      setRecords(r => r.map(x => x._id===updated._id ? updated : x));
      if (detail?._id === updated._id) setDetail(updated);
      setShowModal(false); setEditRecord(null);
      return updated;
    } else {
      const created = await homeCareService.create(form);
      setRecords(r => [created, ...r]);
      setShowModal(false);
      return created;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this home care record?')) return;
    await homeCareService.delete(id);
    setRecords(r => r.filter(x => x._id !== id));
    if (detail?._id === id) setDetail(null);
  };

  const handleUpdate = (updated) => {
    setRecords(r => r.map(x => x._id===updated._id ? updated : x));
    setDetail(updated);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.patientName?.toLowerCase().includes(q) || r.performerName?.toLowerCase().includes(q) || r.serviceType?.toLowerCase().includes(q) || r.visitedBy?.toLowerCase().includes(q);
    const matchS = statusFilter==='All' || r.status===statusFilter;
    return matchQ && matchS;
  });

  const stats = {
    total:     records.length,
    scheduled: records.filter(r=>r.status==='Scheduled').length,
    inProgress:records.filter(r=>r.status==='In Progress').length,
    completed: records.filter(r=>r.status==='Completed').length,
  };

  const Stat = ({ label, value, color, bg }) => (
    <div className="text-center p-3 rounded-3 flex-grow-1" style={{ backgroundColor: bg, border:`1.5px solid ${color}30`, minWidth:100 }}>
      <div className="fw-black" style={{ fontSize:'1.8rem', color, lineHeight:1 }}>{value}</div>
      <div className="small fw-semibold mt-1" style={{ color:'#64748b' }}>{label}</div>
    </div>
  );

  return (
    <div className="d-flex flex-column" style={{ minHeight:'100vh', backgroundColor:'#f1f5f9' }}>
      <Navbar />

      {/* Page Banner */}
      <div style={{ background:'linear-gradient(135deg,#0f766e 0%,#0d9488 60%,#14b8a6 100%)', padding:'24px 32px 28px' }}>
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center" style={{ width:52, height:52 }}>
              <Home size={26} className="text-white"/>
            </div>
            <div>
              <h4 className="text-white fw-black mb-0" style={{ letterSpacing:'-0.5px' }}>Home Care</h4>
              <div className="text-white small opacity-75">Manage all at-home patient care records</div>
            </div>
          </div>
          <button
            className="btn fw-bold rounded-pill px-4 d-flex align-items-center gap-2 shadow"
            style={{ backgroundColor:'#fff', color:'#0f766e', fontSize:'0.88rem' }}
            onClick={() => { setEditRecord(null); setShowModal(true); }}
          >
            <Plus size={18}/> New Record
          </button>
        </div>

        {/* Stats */}
        <div className="d-flex gap-3 mt-4 flex-wrap">
          <Stat label="Total" value={stats.total} color="#0d9488" bg="rgba(255,255,255,0.92)"/>
          <Stat label="Scheduled" value={stats.scheduled} color="#3b82f6" bg="rgba(255,255,255,0.92)"/>
          <Stat label="In Progress" value={stats.inProgress} color="#d97706" bg="rgba(255,255,255,0.92)"/>
          <Stat label="Completed" value={stats.completed} color="#059669" bg="rgba(255,255,255,0.92)"/>
        </div>
      </div>

      {/* Content */}
      <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight:0 }}>
        {/* List side */}
        <div className="d-flex flex-column overflow-hidden" style={{ flex: detail ? '0 0 55%' : '1 1 100%', transition:'flex 0.3s', minWidth:0 }}>
          {/* Search + Filter Bar */}
          <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white" style={{ borderBottom:'1px solid #e2e8f0', flexWrap:'wrap', gap:'8px' }}>
            <div className="position-relative" style={{ minWidth:220, flex:1, maxWidth:320 }}>
              <Search size={15} className="position-absolute text-secondary" style={{ top:'50%', left:12, transform:'translateY(-50%)' }}/>
              <input
                className="form-control shadow-none"
                style={{ paddingLeft:'2.2rem', borderRadius:24, border:'1.5px solid #e2e8f0', fontSize:'0.85rem' }}
                placeholder="Search patient, caregiver..." value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="d-flex gap-1 flex-wrap">
              {['All','Scheduled','In Progress','Completed','Cancelled'].map(s => (
                <button key={s}
                  className="btn btn-sm rounded-pill px-3"
                  style={{
                    fontSize:'0.78rem', fontWeight:600,
                    backgroundColor: statusFilter===s ? '#0d9488' : 'transparent',
                    color: statusFilter===s ? '#fff' : '#64748b',
                    border: statusFilter===s ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                    transition:'all 0.2s'
                  }}
                  onClick={() => setStatusFilter(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="flex-grow-1 overflow-auto p-4">
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <Loader size={28} className="text-primary spin"/>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize:'3.5rem' }} className="mb-3">🏠</div>
                <h6 className="fw-bold text-dark">No Records Found</h6>
                <p className="text-secondary small">Click "New Record" to schedule a home care visit.</p>
              </div>
            ) : (
              <div className={detail ? 'd-flex flex-column gap-3' : 'row g-3'}>
                {filtered.map(rec => {
                  const s = STATUS_CONFIG[rec.status] || STATUS_CONFIG['Scheduled'];
                  const selected = detail?._id === rec._id;
                  return (
                    <div key={rec._id} className={detail ? '' : 'col-xl-4 col-lg-6 col-md-6'}>
                      <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius:14, cursor:'pointer', outline: selected ? '2px solid #0d9488' : 'none', transition:'all 0.18s' }}
                        onMouseEnter={e => !selected && (e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)')}
                        onMouseLeave={e => !selected && (e.currentTarget.style.boxShadow='')}
                        onClick={() => setDetail(rec)}
                      >
                        <div style={{ height:4, background:s.color, borderRadius:'14px 14px 0 0' }}></div>
                        <div className="p-3">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div>
                              <div className="fw-bold text-dark" style={{ fontSize:'0.92rem' }}>{rec.patientName}</div>
                              <div className="text-secondary" style={{ fontSize:'0.78rem' }}>
                                {rec.patientAge ? `${rec.patientAge} yrs` : ''}{rec.patientGender ? ` · ${rec.patientGender}` : ''}
                              </div>
                            </div>
                            <span className="badge d-flex align-items-center gap-1 px-2 py-1 rounded-pill" style={{ backgroundColor:s.bg, color:s.color, fontSize:'0.7rem', fontWeight:700 }}>
                              {s.icon}{rec.status}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-1 mb-2">
                            <span className="badge rounded-pill px-2" style={{ backgroundColor:'#eff6ff', color:'#2563eb', fontSize:'0.7rem', fontWeight:600 }}>{rec.serviceType}</span>
                            <span className="badge rounded-pill px-2" style={{ backgroundColor:'#f8fafc', color:'#64748b', fontSize:'0.7rem' }}>{rec.frequency}</span>
                          </div>

                          <div className="d-flex align-items-center gap-2 mb-2 text-secondary" style={{ fontSize:'0.78rem' }}>
                            <Calendar size={11}/> {fmt(rec.startDate)} {rec.timeSlot && <><Clock size={11}/>{rec.timeSlot}</>}
                          </div>

                          <div className="d-flex align-items-center justify-content-between pt-2" style={{ borderTop:'1px solid #f1f5f9' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width:26, height:26, backgroundColor:'#8b5cf6', fontSize:'0.7rem' }}>
                                {rec.performerName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold text-dark" style={{ fontSize:'0.78rem' }}>{rec.performerName}</div>
                                <div className="text-secondary" style={{ fontSize:'0.68rem' }}>{rec.performerRole}</div>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {rec.visitedBy && (
                                <span title={`Visited by ${rec.visitedBy}`} className="badge rounded-pill px-2" style={{ backgroundColor:'#fff7ed', color:'#ea580c', fontSize:'0.68rem' }}>
                                  🚗 {rec.visitedBy.split(' ')[0]}
                                </span>
                              )}
                              {rec.documents?.length > 0 && (
                                <span className="badge rounded-pill px-2" style={{ backgroundColor:'#f0fdf4', color:'#059669', fontSize:'0.68rem' }}>
                                  📎 {rec.documents.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {detail && (
          <div style={{ flex:'0 0 45%', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <DetailPanel
              record={detail}
              onClose={() => setDetail(null)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={(r) => { setEditRecord(r); setShowModal(true); }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <RecordModal
          initial={editRecord}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditRecord(null); }}
        />
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .fw-black { font-weight: 900 !important; }
      `}</style>
    </div>
  );
};

export default HomeCarePage;
