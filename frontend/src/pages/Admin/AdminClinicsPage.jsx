import React, { useState, useEffect, useRef } from 'react';
import clinicService from '../../services/clinicService';
import { Building2, Plus, Edit2, Trash2, ImagePlus, X, Upload, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';

const AdminClinicsPage = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState(null);

  // Logo upload state
  const [logoUploadingId, setLogoUploadingId] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoSuccess, setLogoSuccess] = useState(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const data = await clinicService.getAllClinics();
      setClinics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await clinicService.updateClinic(editingId, formData);
      } else {
        await clinicService.createClinic(formData);
      }
      setFormData({ name: '', address: '', phone: '', email: '' });
      setIsAdding(false);
      setEditingId(null);
      fetchClinics();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (clinic) => {
    setEditingId(clinic._id);
    setFormData({ name: clinic.name, address: clinic.address, phone: clinic.phone, email: clinic.email });
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this clinic?')) {
      try {
        await clinicService.deleteClinic(id);
        fetchClinics();
      } catch (err) {
        console.error(err);
        alert('Failed to delete clinic');
      }
    }
  };

  // ── Logo handlers ─────────────────────────────────────────────────────────
  const openLogoUpload = (clinicId) => {
    setLogoUploadingId(clinicId);
    setLogoPreview(null);
    setLogoFile(null);
    setLogoSuccess(null);
  };

  const closeLogoUpload = () => {
    setLogoUploadingId(null);
    setLogoPreview(null);
    setLogoFile(null);
    setLogoSuccess(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoSuccess(null);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !logoUploadingId) return;
    try {
      const updated = await clinicService.uploadLogo(logoUploadingId, logoFile);
      setLogoSuccess('Logo uploaded successfully!');
      setLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      // Update local state
      setClinics(prev => prev.map(c => c._id === updated._id ? updated : c));
      setTimeout(closeLogoUpload, 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to upload logo');
    }
  };

  const handleRemoveLogo = async (clinicId) => {
    if (!window.confirm('Remove the clinic logo?')) return;
    try {
      const updated = await clinicService.removeLogo(clinicId);
      setClinics(prev => prev.map(c => c._id === updated._id ? updated : c));
    } catch (err) {
      console.error(err);
      alert('Failed to remove logo');
    }
  };

  return (
    <div className="bg-white rounded shadow-sm p-4 h-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="m-0" style={{ color: '#1e293b' }}><Building2 className="me-2" /> Clinics Management</h4>
        {!isAdding && (
          <button className="btn btn-primary btn-sm px-3" onClick={() => setIsAdding(true)}>
            <Plus size={16} className="me-1" /> Add Clinic
          </button>
        )}
      </div>

      {isAdding && (
        <div className="card mb-4 bg-light border-0">
          <div className="card-body">
            <h6 className="card-title mb-3">{editingId ? 'Edit Clinic' : 'Add New Clinic'}</h6>
            <form onSubmit={handleSave} className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Clinic Name*</label>
                <input type="text" className="form-control form-control-sm" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Phone</label>
                <input
                  type="tel"
                  className={`form-control form-control-sm ${formData.phone && formData.phone.length > 0 && formData.phone.length < 10 ? 'border-danger' : ''}`}
                  maxLength={10}
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'').slice(0,10)})}
                />
                {formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
                  <div className="text-danger" style={{ fontSize: '0.72rem' }}>{10 - formData.phone.length} more digit{10 - formData.phone.length !== 1 ? 's' : ''} required</div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label small">Email</label>
                <input type="email" className="form-control form-control-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Address</label>
                <input type="text" className="form-control form-control-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="col-12 mt-3">
                <button type="submit" className="btn btn-primary btn-sm me-2">Save</button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({name:'', address:'', phone:'', email:''}); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logo Upload Panel */}
      {logoUploadingId && (
        <div className="card mb-4 border-0" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)', borderLeft: '4px solid #0056b3 !important' }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold" style={{ color: '#0056b3' }}>
                <ImagePlus size={18} className="me-2" />
                Upload Clinic Logo — <span className="text-muted fw-normal" style={{ fontSize: '0.85rem' }}>
                  {clinics.find(c => c._id === logoUploadingId)?.name}
                </span>
              </h6>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeLogoUpload}><X size={14} /></button>
            </div>

            {logoSuccess ? (
              <div className="d-flex align-items-center gap-2 text-success fw-semibold">
                <CheckCircle size={20} />
                {logoSuccess}
              </div>
            ) : (
              <div className="row g-3 align-items-center">
                {/* Current logo preview */}
                {(() => {
                  const clinic = clinics.find(c => c._id === logoUploadingId);
                  return clinic?.logo ? (
                    <div className="col-auto">
                      <div className="small text-muted mb-1">Current Logo</div>
                      <img
                        src={`${API_BASE}/${clinic.logo.replace(/^\/+/, '')}`}
                        alt="Current Logo"
                        style={{ height: '64px', maxWidth: '120px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '6px', background: '#fff', padding: '4px' }}
                      />
                    </div>
                  ) : null;
                })()}

                {/* New logo preview */}
                {logoPreview && (
                  <div className="col-auto">
                    <div className="small text-muted mb-1">New Logo Preview</div>
                    <img
                      src={logoPreview}
                      alt="New Logo"
                      style={{ height: '64px', maxWidth: '120px', objectFit: 'contain', border: '2px solid #0056b3', borderRadius: '6px', background: '#fff', padding: '4px' }}
                    />
                  </div>
                )}

                <div className="col">
                  <label
                    htmlFor="clinic-logo-input"
                    className="btn btn-outline-primary btn-sm me-2"
                    style={{ cursor: 'pointer' }}
                  >
                    <Upload size={14} className="me-1" />
                    {logoPreview ? 'Change Image' : 'Choose Image'}
                  </label>
                  <input
                    id="clinic-logo-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={logoInputRef}
                    onChange={handleLogoFileChange}
                  />
                  {logoFile && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleLogoUpload}
                    >
                      <Upload size={14} className="me-1" />
                      Upload Logo
                    </button>
                  )}
                  <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                    Accepted: JPG, PNG, GIF, WebP, SVG · Max 5 MB<br/>
                    The logo will appear in the clinic's prescription header.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status"></div></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '70px' }}>Logo</th>
                <th>Clinic Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => (
                <tr key={c._id}>
                  <td>
                    {c.logo ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={`${API_BASE}/${c.logo.replace(/^\/+/, '')}`}
                          alt={c.name}
                          style={{ height: '40px', maxWidth: '60px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '4px', background: '#f8f9fa', padding: '2px' }}
                        />
                        <button
                          title="Remove Logo"
                          onClick={() => handleRemoveLogo(c._id)}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            background: '#dc3545', border: 'none', borderRadius: '50%',
                            width: '16px', height: '16px', color: '#fff', fontSize: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', padding: 0, lineHeight: 1
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{ width: '40px', height: '40px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="No logo"
                      >
                        <Building2 size={16} color="#94a3b8" />
                      </div>
                    )}
                  </td>
                  <td className="fw-semibold">{c.name}</td>
                  <td className="text-muted small">{c.address}</td>
                  <td className="text-muted small">{c.phone}</td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-light text-success me-1"
                      title="Upload Logo"
                      onClick={() => openLogoUpload(c._id)}
                    >
                      <ImagePlus size={14} />
                    </button>
                    <button className="btn btn-sm btn-light text-primary me-1" onClick={() => handleEdit(c)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(c._id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No clinics found. Add one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminClinicsPage;
