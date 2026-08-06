import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clinicService from '../../services/clinicService';
import { MapPin, ArrowRight } from 'lucide-react';

const SelectClinic = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await clinicService.getMyClinics();
        setClinics(data);
      } catch (err) {
        console.error('Failed to fetch clinics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  const handleSelectClinic = (clinic) => {
    localStorage.setItem('clinicId', clinic._id);
    localStorage.setItem('clinicName', clinic.name);
    navigate('/'); // Redirect to dashboard
  };

  return (
    <div className="auth-form-container" style={{ padding: '2rem 3rem' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 style={{ margin: 0, color: '#1d4ed8', fontWeight: 'bold' }}>Select your Clinic</h3>
      </div>
      
      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>
      ) : clinics.length === 0 ? (
        <div className="alert alert-warning">No clinics assigned to this account.</div>
      ) : (
        <div className="clinic-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
          {clinics.map(clinic => (
            <div 
              key={clinic._id} 
              className="clinic-card"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s',
                backgroundColor: '#fff'
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
