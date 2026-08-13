import React, { useState, useEffect } from 'react';
import clinicService from '../../services/clinicService';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';

const AdminClinicsPage = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState(null);

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

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status"></div></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Clinic Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => (
                <tr key={c._id}>
                  <td className="fw-semibold">{c.name}</td>
                  <td className="text-muted small">{c.address}</td>
                  <td className="text-muted small">{c.phone}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-light text-primary me-2" onClick={() => handleEdit(c)}>
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">No clinics found. Add one to get started.</td>
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
