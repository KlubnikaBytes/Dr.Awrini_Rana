import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clinicService from '../../services/clinicService';
import { MapPin, ArrowRight, PlusCircle, X } from 'lucide-react';

const SelectClinic = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newClinic, setNewClinic] = useState({ name: '', address: '', phone: '', email: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const data = await clinicService.getAllClinics();
      setClinics(data);
    } catch (err) {
      console.error('Failed to fetch clinics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClinic = (clinic) => {
    localStorage.setItem('clinicId', clinic._id);
    localStorage.setItem('clinicName', clinic.name);
    navigate('/');
  };

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    if (!newClinic.name.trim()) {
      setCreateError('Clinic name is required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const created = await clinicService.createClinic(newClinic);
      // Automatically select the newly created clinic and go to dashboard
      localStorage.setItem('clinicId', created._id);
      localStorage.setItem('clinicName', created.name);
      navigate('/');
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create clinic.');
      setCreating(false);
    }
  };

  return (
    <div className="auth-form-container" style={{ padding: '2rem 3rem' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 style={{ margin: 0, color: '#1d4ed8', fontWeight: 'bold' }}>Select your Clinic</h3>
        <button
          onClick={() => { setShowCreateForm(true); setCreateError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: '#1d4ed8', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '0.45rem 0.9rem',
            fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer'
          }}
        >
          <PlusCircle size={15} /> New Clinic
        </button>
      </div>

      {/* Create Clinic Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '2rem',
            width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h4 style={{ margin: 0, color: '#1e293b', fontWeight: '700' }}>Create New Clinic</h4>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '0.8rem', background: '#fef2f2', padding: '0.5rem 0.8rem', borderRadius: '6px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClinic}>
              {[
                { label: 'Clinic Name *', key: 'name', placeholder: 'e.g. City Health Clinic', type: 'text' },
                { label: 'Address', key: 'address', placeholder: 'Street, City', type: 'text' },
                { label: 'Phone', key: 'phone', placeholder: '+91 98765 43210', type: 'tel' },
                { label: 'Email', key: 'email', placeholder: 'clinic@example.com', type: 'email' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} style={{ marginBottom: '0.9rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '0.3rem' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={newClinic[key]}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1',
                      borderRadius: '7px', fontSize: '0.88rem', outline: 'none',
                      boxSizing: 'border-box', color: '#1e293b'
                    }}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={creating}
                style={{
                  width: '100%', padding: '0.65rem', background: creating ? '#93c5fd' : '#1d4ed8',
                  color: '#fff', border: 'none', borderRadius: '7px',
                  fontWeight: '700', fontSize: '0.9rem', cursor: creating ? 'not-allowed' : 'pointer',
                  marginTop: '0.4rem'
                }}
              >
                {creating ? 'Creating…' : 'Create & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>
      ) : clinics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{
            background: '#eff6ff', border: '1px dashed #93c5fd',
            borderRadius: '10px', padding: '2rem', color: '#1e40af'
          }}>
            <PlusCircle size={36} style={{ marginBottom: '0.75rem', opacity: 0.7 }} />
            <p style={{ fontWeight: '600', fontSize: '0.95rem', margin: '0 0 0.4rem' }}>No clinics assigned yet</p>
            <p style={{ fontSize: '0.82rem', color: '#3b82f6', margin: '0 0 1rem' }}>Create your first clinic to get started</p>
            <button
              onClick={() => { setShowCreateForm(true); setCreateError(''); }}
              style={{
                background: '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: '7px', padding: '0.55rem 1.3rem',
                fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer'
              }}
            >
              + Create Clinic
            </button>
          </div>
        </div>
      ) : (
        <div className="clinic-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
          {clinics.map(clinic => (
            <div
              key={clinic._id}
              className="clinic-card"
              style={{
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', transition: 'all 0.2s', backgroundColor: '#fff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
              onClick={() => handleSelectClinic(clinic)}
            >
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: '600' }}>{clinic.name}</h5>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                  <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ lineHeight: '1.2' }}>{clinic.address || 'Address not provided'}</span>
                </div>
              </div>
              <ArrowRight size={20} color="#94a3b8" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectClinic;
