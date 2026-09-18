import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import doctorService from '../../../services/doctorService';

const PrescriptionsTab = ({ patient }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!patient?._id) return;
    setLoading(true);
    doctorService.getPastConsultations(patient._id)
      .then(data => {
        // Sort by createdAt descending
        const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPrescriptions(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch prescriptions", err);
        setLoading(false);
      });
  }, [patient]);

  const handlePrint = (appointmentId) => {
    window.open(`/doctor/visit/${appointmentId}/print`, '_blank');
  };

  const handleEmail = (appointmentId) => {
    window.location.href = `mailto:${patient.email || ''}?subject=Your Prescription&body=Please find your prescription details.`;
  };

  const handleWhatsApp = (appointmentId) => {
    const phone = patient.phone || patient.phoneNumber || '';
    if (!phone) {
        alert("Patient does not have a phone number registered.");
        return;
    }
    const msg = `Hello ${patient.name}, here is your prescription. Please print or save the PDF.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = prescriptions.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const docName = (p.appointment?.doctorName || '').toLowerCase();
    const diag = (p.diagnosis || []).join(' ').toLowerCase();
    const meds = (p.medicines || []).map(m => m.medicineName).join(' ').toLowerCase();
    return docName.includes(q) || diag.includes(q) || meds.includes(q);
  });

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* Header and Search */}
      <div className="p-4 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ backgroundColor: '#f8fafc' }}>
        <div>
          <h5 className="mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <FileText size={20} style={{ color: '#2563eb' }} /> Prescriptions
          </h5>
          <div className="text-secondary small">View and share past prescriptions</div>
        </div>
        <div className="position-relative" style={{ minWidth: '300px' }}>
          <Search size={16} className="position-absolute text-muted" style={{ left: 12, top: 10 }} />
          <input 
            type="text" 
            className="form-control form-control-sm ps-5" 
            placeholder="Search by diagnosis, medicine, doctor..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-grow-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center mt-5 text-secondary">Loading prescriptions...</div>
        ) : filtered.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-secondary">
            <AlertCircle size={40} style={{ opacity: 0.3 }} />
            <div className="fw-semibold">No prescriptions found</div>
            {searchQuery && <div className="small">Try a different search term</div>}
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filtered.map(rx => {
              const dateObj = new Date(rx.createdAt || rx.date);
              const apptId = rx.appointment?._id || rx.appointment;
              return (
                <div key={rx._id} className="card shadow-sm border-0" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="card-body p-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                          {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                          Dr. {rx.appointment?.doctorName || 'Assigned Doctor'}
                        </span>
                      </div>
                      
                      {rx.diagnosis && rx.diagnosis.length > 0 && (
                        <div className="mb-1" style={{ fontSize: '0.85rem' }}>
                          <span className="text-secondary fw-semibold">Diagnosis: </span>
                          <span className="text-dark">{rx.diagnosis.join(', ')}</span>
                        </div>
                      )}
                      
                      {rx.medicines && rx.medicines.length > 0 && (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span className="text-secondary fw-semibold">Medicines: </span>
                          <span className="text-dark">{rx.medicines.length} prescribed</span>
                        </div>
                      )}
                    </div>

                    <div className="d-flex gap-2">
                      <button 
                        onClick={() => handlePrint(apptId)}
                        className="btn btn-sm btn-light border d-flex align-items-center gap-2 px-3 fw-semibold"
                      >
                        <Printer size={14} className="text-secondary" /> Print
                      </button>
                      <button 
                        onClick={() => handleEmail(apptId)}
                        className="btn btn-sm btn-light border d-flex align-items-center gap-2 px-3 fw-semibold"
                      >
                        <Mail size={14} className="text-secondary" /> Email
                      </button>
                      <button 
                        onClick={() => handleWhatsApp(apptId)}
                        className="btn btn-sm d-flex align-items-center gap-2 px-3 fw-semibold"
                        style={{ backgroundColor: '#25D366', color: '#fff', border: 'none' }}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionsTab;
