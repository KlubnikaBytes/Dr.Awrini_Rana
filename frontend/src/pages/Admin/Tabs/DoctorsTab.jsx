import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, X, Save, Stethoscope, Upload, CheckCircle } from 'lucide-react';
import adminService from '../../../services/adminService';

const SPECIALIZATIONS = [
  'General Medicine', 'Internal Medicine', 'Cardiology', 'Gynaecology & Obstetrics',
  'Paediatrics', 'Orthopaedics', 'Dermatology', 'Neurology', 'Psychiatry',
  'Ophthalmology', 'ENT', 'Urology', 'Nephrology', 'Gastroenterology',
  'Pulmonology', 'Endocrinology', 'Oncology', 'Rheumatology', 'Diabetology',
  'Radiology', 'Pathology', 'Anaesthesiology', 'Surgery (General)', 'Dentistry', 'Other'
];

const SPEC_COLORS = {
  'Cardiology': '#dc2626', 'Gynaecology & Obstetrics': '#be185d', 'Paediatrics': '#7c3aed',
  'Neurology': '#1d4ed8', 'Orthopaedics': '#0369a1', 'Dermatology': '#d97706',
  'General Medicine': '#059669', 'Internal Medicine': '#059669', 'Diabetology': '#9333ea',
  'ENT': '#0891b2', 'Ophthalmology': '#2563eb', 'Gastroenterology': '#b45309',
};
const specColor = (s) => SPEC_COLORS[s] || '#475569';

const emptyForm = {
  name: '', gender: 'Male', email: '', phone: '', password: '',
  speciality: '', qualifications: '', registrationNo: '',
  contactForPrescription: '', bio: '', signatureText: '',
  department: 'None', role: 'Doctor'
};

const DoctorsTab = () => {
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [signatureImg, setSignatureImg] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterSpec, setFilterSpec] = useState('All');
  const fileRef = useRef();

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    try {
      const all = await adminService.getStaff();
      setDoctors((Array.isArray(all) ? all : []).filter(s => s.role === 'Doctor'));
    } catch (e) { console.error(e); }
  };

  const handleAddNew = () => {
    setSelected(null);
    setIsEditing(false);
    setForm(emptyForm);
    setSignatureImg('');
    setShowForm(true);
  };

  const handleSelect = (doc) => {
    setSelected(doc);
    setIsEditing(false);
    setShowForm(false);
  };

  const handleEdit = () => {
    setForm({
      name: selected.name || '',
      gender: selected.gender || 'Male',
      email: selected.email || '',
      phone: selected.phone || '',
      password: '',
      speciality: selected.speciality || '',
      qualifications: selected.qualifications || '',
      registrationNo: selected.registrationNo || '',
      contactForPrescription: selected.contactForPrescription || '',
      bio: selected.bio || '',
      signatureText: selected.signatureText || '',
      department: selected.department || 'None',
      role: 'Doctor'
    });
    setSignatureImg(selected.signatureImage || '');
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete Dr. ${selected.name}? This cannot be undone.`)) return;
    try {
      await adminService.deleteStaff(selected._id);
      setSelected(null);
      fetchDoctors();
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSignatureImg(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone)) { alert('Enter a valid 10-digit phone number.'); return; }
    if (!isEditing && form.password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    const payload = { ...form, signatureImage: signatureImg };
    try {
      if (isEditing && selected) {
        await adminService.updateStaff(selected._id, payload);
        alert('Doctor updated successfully!');
      } else {
        await adminService.addStaff(payload);
        alert('Doctor added successfully!');
      }
      fetchDoctors();
      setShowForm(false);
      setSelected(null);
    } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const bySpec = {};
  doctors
    .filter(d => filterSpec === 'All' || (d.speciality || 'General') === filterSpec)
    .forEach(d => {
      const k = d.speciality || 'General';
      if (!bySpec[k]) bySpec[k] = [];
      bySpec[k].push(d);
    });

  const allSpecs = [...new Set(doctors.map(d => d.speciality || 'General'))].sort();

  return (
    <div className="d-flex h-100 p-2 gap-2" style={{ backgroundColor: '#f5f7fa' }}>

      {/* LEFT: Doctor List */}
      <div className="bg-white border rounded d-flex flex-column" style={{ width: '300px', flexShrink: 0 }}>
        <div className="p-3 border-bottom flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '8px 8px 0 0' }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="text-white fw-bold d-flex align-items-center gap-2" style={{ fontSize: '0.92rem' }}>
              <Stethoscope size={16} /> Doctors
              <span className="badge rounded-pill ms-1" style={{ backgroundColor: 'rgba(255,255,255,0.25)', fontSize: '0.68rem' }}>{doctors.length}</span>
            </div>
            <button className="btn btn-sm fw-bold d-flex align-items-center gap-1"
              style={{ backgroundColor: '#fff', color: '#2563eb', fontSize: '0.75rem', borderRadius: 20, padding: '3px 10px' }}
              onClick={handleAddNew}>
              <Plus size={13} /> Add
            </button>
          </div>
          <select className="form-select form-select-sm" style={{ fontSize: '0.75rem', borderRadius: 6 }}
            value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
            <option value="All">All Specializations</option>
            {allSpecs.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex-grow-1 overflow-auto p-2">
          {Object.keys(bySpec).length === 0 ? (
            <div className="text-center text-muted py-5">
              <Stethoscope size={36} className="mb-3 opacity-25" />
              <div className="fw-semibold small">No doctors yet</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>Click "+ Add" to get started</div>
            </div>
          ) : (
            Object.entries(bySpec).map(([spec, docs]) => (
              <div key={spec} className="mb-3">
                <div className="d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded"
                  style={{ backgroundColor: specColor(spec) + '15', borderLeft: `3px solid ${specColor(spec)}` }}>
                  <span className="fw-bold" style={{ fontSize: '0.68rem', color: specColor(spec), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {spec}
                  </span>
                  <span className="ms-auto badge rounded-pill" style={{ backgroundColor: specColor(spec), color: '#fff', fontSize: '0.58rem' }}>{docs.length}</span>
                </div>
                {docs.map(doc => (
                  <div key={doc._id}
                    className="d-flex align-items-center gap-2 p-2 rounded mb-1"
                    onClick={() => handleSelect(doc)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selected?._id === doc._id ? specColor(doc.speciality || 'General') + '15' : '#fff',
                      border: `1.5px solid ${selected?._id === doc._id ? specColor(doc.speciality || 'General') + '60' : 'transparent'}`,
                      transition: 'all 0.15s'
                    }}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style={{ width: 34, height: 34, background: `linear-gradient(135deg,${specColor(doc.speciality || 'General')},${specColor(doc.speciality || 'General')}99)`, fontSize: '0.85rem' }}>
                      {doc.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold" style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Dr. {doc.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.qualifications || doc.email}
                      </div>
                    </div>
                    {doc.signatureImage && <CheckCircle size={13} style={{ color: '#059669', flexShrink: 0 }} title="Signature uploaded" />}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="bg-white border rounded flex-grow-1 d-flex flex-column overflow-hidden">

        {/* ADD/EDIT FORM */}
        {showForm && (
          <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
            <div className="d-flex align-items-center justify-content-between px-4 py-3 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
              <div className="text-white fw-bold d-flex align-items-center gap-2">
                <Stethoscope size={16} />
                {isEditing ? `Editing — Dr. ${selected?.name}` : 'Add New Doctor'}
              </div>
              <button type="button" className="btn btn-sm"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6 }}
                onClick={() => setShowForm(false)}><X size={14} /></button>
            </div>

            <div className="flex-grow-1 overflow-auto p-4">
              <div className="row g-3">

                {/* Personal */}
                <div className="col-12">
                  <div className="fw-bold pb-1 border-bottom mb-1" style={{ fontSize: '0.78rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👤 Personal Details
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Full Name *</label>
                  <input type="text" className="form-control form-control-sm" placeholder="e.g. Aswini Rana"
                    value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Gender *</label>
                  <div className="d-flex gap-3 mt-1">
                    {['Male', 'Female', 'Other'].map(g => (
                      <div key={g} className="form-check">
                        <input className="form-check-input" type="radio" id={`g-${g}`} checked={form.gender === g} onChange={() => set('gender', g)} />
                        <label className="form-check-label small" htmlFor={`g-${g}`}>{g}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Login Email *</label>
                  <input type="email" className="form-control form-control-sm" placeholder="doctor@clinic.com"
                    value={form.email} onChange={e => set('email', e.target.value)} required disabled={isEditing} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Phone *</label>
                  <input type="tel" className="form-control form-control-sm" placeholder="10-digit number" maxLength={10}
                    value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} required />
                </div>
                {!isEditing && (
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Login Password *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Min 8 alphanumeric"
                      value={form.password} onChange={e => set('password', e.target.value)} required />
                  </div>
                )}

                {/* Professional */}
                <div className="col-12 mt-2">
                  <div className="fw-bold pb-1 border-bottom mb-1" style={{ fontSize: '0.78rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🩺 Professional Details (shown on prescription)
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Specialization *</label>
                  <select className="form-select form-select-sm" value={form.speciality} onChange={e => set('speciality', e.target.value)} required>
                    <option value="">Select Specialization</option>
                    {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Registration Number</label>
                  <input type="text" className="form-control form-control-sm" placeholder="e.g. Reg no - 65941 (WBMC)"
                    value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold text-muted">Qualifications</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="e.g. MBBS(CAL), MD(MEDICINE), IPGMER, CCEBDM(DELHI)"
                    value={form.qualifications} onChange={e => set('qualifications', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Contact for Prescription</label>
                  <input type="text" className="form-control form-control-sm" placeholder="Phone shown on prescription"
                    value={form.contactForPrescription} onChange={e => set('contactForPrescription', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Department</label>
                  <input type="text" className="form-control form-control-sm" placeholder="e.g. Internal Medicine"
                    value={form.department === 'None' ? '' : form.department}
                    onChange={e => set('department', e.target.value || 'None')} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold text-muted">Additional Bio / Credentials</label>
                  <textarea className="form-control form-control-sm" rows={2}
                    placeholder="e.g. Consultant Physician & Diabetologist, Ex-Doctor AIIMS Kalyani, SSKM/PG Hospital"
                    value={form.bio} onChange={e => set('bio', e.target.value)} />
                </div>

                {/* Signature */}
                <div className="col-12 mt-2">
                  <div className="fw-bold pb-1 border-bottom mb-2" style={{ fontSize: '0.78rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ✍️ Signature (appears on printed prescriptions)
                  </div>
                  <div className="rounded-3 d-flex flex-column align-items-center justify-content-center text-center"
                    style={{ minHeight: 140, border: '2px dashed #2563eb', backgroundColor: '#f0f6ff', cursor: 'pointer', position: 'relative' }}
                    onClick={() => fileRef.current.click()}>
                    {signatureImg ? (
                      <>
                        <img src={signatureImg} alt="Signature" style={{ maxHeight: 100, maxWidth: '75%', objectFit: 'contain' }} />
                        <div className="text-primary small mt-2">✓ Uploaded — click to change</div>
                      </>
                    ) : (
                      <>
                        <Upload size={28} style={{ color: '#2563eb', marginBottom: 8 }} />
                        <div className="fw-bold" style={{ color: '#2563eb', fontSize: '0.85rem' }}>Click to upload signature image</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>PNG with transparent background recommended</div>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSignatureUpload} />
                  </div>
                  {signatureImg && (
                    <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => setSignatureImg('')}>Remove signature</button>
                  )}
                </div>

              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 px-4 py-3 border-top flex-shrink-0" style={{ backgroundColor: '#f8fafc' }}>
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn rounded-pill px-5 fw-bold d-flex align-items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff' }} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> {isEditing ? 'Saving...' : 'Adding...'}</> :
                  <><Save size={14} /> {isEditing ? 'Save Changes' : 'Add Doctor'}</>}
              </button>
            </div>
          </form>
        )}

        {/* DETAIL VIEW */}
        {!showForm && selected && (
          <div className="d-flex flex-column h-100">
            <div className="px-4 py-3 flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${specColor(selected.speciality)},${specColor(selected.speciality)}cc)` }}>
              <div className="d-flex align-items-start justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-white d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: 50, height: 50, color: specColor(selected.speciality), fontSize: '1.4rem' }}>
                    {selected.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white fw-bold" style={{ fontSize: '1.05rem' }}>Dr. {selected.name}</div>
                    <div className="text-white opacity-75 small">{selected.speciality || 'Doctor'}</div>
                    {selected.registrationNo && <div className="text-white opacity-75" style={{ fontSize: '0.7rem' }}>{selected.registrationNo}</div>}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm fw-bold d-flex align-items-center gap-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, fontSize: '0.78rem' }}
                    onClick={handleEdit}><Edit3 size={12} /> Edit</button>
                  <button className="btn btn-sm"
                    style={{ backgroundColor: 'rgba(220,38,38,0.3)', color: '#fff', border: '1px solid rgba(220,38,38,0.5)', borderRadius: 8 }}
                    onClick={handleDelete}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto p-4">
              <div className="row g-3">
                {[
                  ['Qualifications', selected.qualifications],
                  ['Registration No.', selected.registrationNo],
                  ['Specialization', selected.speciality],
                  ['Department', selected.department !== 'None' ? selected.department : null],
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ['Prescription Contact', selected.contactForPrescription || selected.phone],
                  ['Staff ID', selected.staffId],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="col-md-6">
                    <div className="p-3 rounded-3 h-100" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                      <div className="fw-semibold text-dark mt-1" style={{ fontSize: '0.85rem' }}>{value}</div>
                    </div>
                  </div>
                ))}

                {selected.bio && (
                  <div className="col-12">
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#f0f6ff', border: '1px solid #bdd7ff' }}>
                      <div className="text-muted mb-1" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Bio / Additional Info</div>
                      <div className="text-dark" style={{ fontSize: '0.85rem' }}>{selected.bio}</div>
                    </div>
                  </div>
                )}

                <div className="col-12 mt-2">
                  <div className="fw-bold mb-2" style={{ fontSize: '0.78rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✍️ Prescription Signature</div>
                  <div className="p-3 rounded-3 d-flex align-items-center gap-4"
                    style={{ border: '2px dashed #2563eb', backgroundColor: '#f0f6ff' }}>
                    {selected.signatureImage ? (
                      <>
                        <img src={selected.signatureImage} alt="Signature"
                          style={{ height: 70, maxWidth: 200, objectFit: 'contain', border: '1px solid #bdd7ff', borderRadius: 8, padding: 4, backgroundColor: '#fff' }} />
                        <div>
                          <div className="badge bg-success mb-1">✓ Signature uploaded</div>
                          <div className="text-muted small">This image will appear on printed prescriptions</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center w-100 py-2">
                        <div className="text-muted mb-2" style={{ fontSize: '0.82rem' }}>No signature uploaded yet</div>
                        <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={handleEdit}>
                          <Upload size={12} className="me-1" /> Upload Signature
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!showForm && !selected && (
          <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5">
            <div className="mb-4 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 80, height: 80, backgroundColor: '#eff6ff' }}>
              <Stethoscope size={34} style={{ color: '#2563eb' }} />
            </div>
            <h5 className="fw-bold text-dark mb-2">Manage Your Doctors</h5>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 340 }}>
              Add doctors with their full credentials, specialization, and signature. These details will automatically appear on prescriptions.
            </p>
            <button className="btn rounded-pill px-5 fw-bold d-flex align-items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff' }}
              onClick={handleAddNew}>
              <Plus size={16} /> Add First Doctor
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default DoctorsTab;
