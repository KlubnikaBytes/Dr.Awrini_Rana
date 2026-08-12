import React, { useState, useEffect } from 'react';
import moment from 'moment';

const PastVisits = ({ consultations }) => {
  const [selectedVisit, setSelectedVisit] = useState(null);

  useEffect(() => {
    if (consultations && consultations.length > 0 && !selectedVisit) {
      setSelectedVisit(consultations[0]);
    }
  }, [consultations]);

  if (!consultations || consultations.length === 0) {
    return null;
  }

  const handleSelect = (visit) => {
    setSelectedVisit(visit);
  };

  return (
    <div className="bg-light pb-4" style={{ backgroundColor: '#e9ecef', marginTop: '40px' }}>
      <div className="fw-semibold text-secondary px-4 py-2" style={{ backgroundColor: '#ced4da', fontSize: '1.1rem' }}>
        Past Visits
      </div>
      
      <div className="d-flex px-4 pt-4 gap-4" style={{ minHeight: '600px' }}>
        {/* Left Sidebar Timeline */}
        <div className="d-flex flex-column align-items-center" style={{ width: '80px', position: 'relative' }}>
          {/* Vertical dashed line */}
          <div style={{ position: 'absolute', width: '2px', height: '100%', borderLeft: '1px dashed #adb5bd', left: '50%', zIndex: 0 }}></div>
          
          {consultations.map((visit, index) => {
            const isSelected = selectedVisit && selectedVisit._id === visit._id;
            const visitDate = moment(visit.createdAt);
            const isToday = visitDate.isSame(moment(), 'day');
            
            return (
              <button 
                key={visit._id}
                onClick={() => handleSelect(visit)}
                className={`btn bg-white shadow-sm mb-4 d-flex flex-column align-items-center justify-content-center p-2`}
                style={{ 
                  zIndex: 1, 
                  width: '60px', 
                  borderRadius: '4px',
                  border: isSelected ? '1px solid #0d6efd' : '1px solid #dee2e6',
                  color: isSelected ? '#0d6efd' : '#495057',
                  minHeight: '60px'
                }}
              >
                {isToday ? (
                  <>
                    <i className="bi bi-arrow-up text-primary" style={{ fontSize: '1.2rem' }}></i>
                    <span style={{ fontSize: '0.8rem', color: '#0d6efd' }}>Today</span>
                  </>
                ) : (
                  <>
                    <span className="fw-bold" style={{ fontSize: '1rem', lineHeight: '1' }}>{visitDate.format('DD')}</span>
                    <span style={{ fontSize: '0.8rem' }}>{visitDate.format('MMM')}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Main Content */}
        {selectedVisit && (
          <div className="flex-grow-1 bg-white shadow-sm" style={{ borderRadius: '4px', overflow: 'hidden' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="fw-semibold text-dark">
                {moment(selectedVisit.createdAt).format('DD-MMM-YYYY')} By : {selectedVisit.appointment?.doctorName || 'Dr Aswini Rana'}
              </div>
              <div className="d-flex gap-3">
                <button className="btn btn-link text-secondary p-0 text-decoration-none" onClick={() => window.open(`/doctor/visit/${selectedVisit.appointment?._id || selectedVisit.appointment}/print`, '_blank')}>
                  <i className="bi bi-printer me-1"></i>Print
                </button>
                <button className="btn btn-link text-secondary p-0 text-decoration-none"><i className="bi bi-envelope me-1"></i>Email</button>
              </div>
            </div>

            <div className="p-4">
              {/* Vitals */}
              {selectedVisit.vitals && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-2">Vitals:</div>
                  <div className="d-flex gap-4 text-secondary small">
                    {selectedVisit.vitals.bpSystolic && <div>BP : {selectedVisit.vitals.bpSystolic}/{selectedVisit.vitals.bpDiastolic}mmHg <span className="ms-3 text-muted">|</span></div>}
                    {selectedVisit.vitals.pulse && <div>Pulse : {selectedVisit.vitals.pulse}bpm <span className="ms-3 text-muted">|</span></div>}
                    {selectedVisit.vitals.weight && <div>Weight : {selectedVisit.vitals.weight}kg <span className="ms-3 text-muted">|</span></div>}
                    {selectedVisit.vitals.spo2 && <div>SPO2 : {selectedVisit.vitals.spo2}% <span className="ms-3 text-muted">|</span></div>}
                  </div>
                </div>
              )}

              {/* Chief Complaints */}
              {selectedVisit.complaints && selectedVisit.complaints.length > 0 && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-1">Chief Complaints:</div>
                  <div className="text-secondary text-uppercase small" style={{ lineHeight: '1.5' }}>
                    {selectedVisit.complaints.map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedVisit.diagnosis && selectedVisit.diagnosis.length > 0 && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-1">Diagnosis:</div>
                  <div className="text-secondary text-uppercase small" style={{ lineHeight: '1.5' }}>
                    {selectedVisit.diagnosis.map((d, i) => <div key={i}>{d}</div>)}
                  </div>
                </div>
              )}

              {/* Rx Table */}
              {selectedVisit.medicines && selectedVisit.medicines.length > 0 && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-2">Rx:</div>
                  <div className="table-responsive border" style={{ borderRadius: '4px' }}>
                    <table className="table table-borderless table-hover align-middle small m-0">
                      <thead style={{ backgroundColor: '#f4f6f8' }}>
                        <tr className="border-bottom">
                          <th className="text-secondary fw-semibold py-2 px-3">#</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Type</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Medicine</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Dosage</th>
                          <th className="text-secondary fw-semibold py-2 px-3">When</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Frequency</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Duration</th>
                          <th className="text-secondary fw-semibold py-2 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVisit.medicines.map((med, index) => (
                          <tr key={index} className="border-bottom">
                            <td className="px-3 py-3 text-secondary">{index + 1}</td>
                            <td className="px-3 py-3 text-uppercase text-secondary">{med.type}</td>
                            <td className="px-3 py-3">
                              <div className="text-uppercase fw-semibold text-dark">{med.medicineName}</div>
                              {med.genericName && <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{med.genericName}</div>}
                            </td>
                            <td className="px-3 py-3 text-secondary">{med.dosage}</td>
                            <td className="px-3 py-3 text-secondary">{med.when}</td>
                            <td className="px-3 py-3 text-secondary">{med.frequency}</td>
                            <td className="px-3 py-3 text-secondary">{med.duration}</td>
                            <td className="px-3 py-3 text-uppercase text-secondary" style={{ maxWidth: '150px' }}>{med.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Advice */}
              {selectedVisit.advice && (
                <div className="mb-4 d-flex">
                   <div className="fw-semibold text-dark me-2">Advice:</div>
                   <div className="text-uppercase text-secondary small" style={{ whiteSpace: 'pre-line' }}>{selectedVisit.advice}</div>
                </div>
              )}

              {/* Tests Requested */}
              {selectedVisit.testsRequested && selectedVisit.testsRequested.length > 0 && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-1">Tests Requested:</div>
                  <div className="text-secondary small" style={{ lineHeight: '1.5' }}>
                    {selectedVisit.testsRequested.map((t, i) => {
                      const name = typeof t === 'string' ? t : t.testName;
                      const instr = typeof t === 'string' ? '' : t.instruction;
                      if (!name) return null;
                      return (
                        <div key={i} className="mb-1 text-uppercase">
                          {name} 
                          {instr && <span className="text-muted ms-2 text-capitalize" style={{fontStyle: 'italic'}}>- {instr}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next Visit */}
              {selectedVisit.nextVisit && selectedVisit.nextVisit.value && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-1">Next Visit:</div>
                  <div className="text-secondary small">
                    {selectedVisit.nextVisit.date ? moment(selectedVisit.nextVisit.date).format('DD-MMM-YYYY') : `${selectedVisit.nextVisit.value} ${selectedVisit.nextVisit.unit}`}
                  </div>
                </div>
              )}

              {/* Referred To */}
              {selectedVisit.referredTo && selectedVisit.referredTo.some(r => r.doctorName) && (
                <div className="mb-4">
                  <div className="fw-semibold text-dark mb-1">Referred To:</div>
                  <div className="d-flex flex-column gap-2 text-secondary small">
                    {selectedVisit.referredTo.filter(r => r.doctorName).map((referral, i) => (
                      <div key={i} className="p-2 border rounded bg-white">
                        <div className="fw-semibold text-dark">Dr. {referral.doctorName}</div>
                        {referral.speciality && <div>Speciality: {referral.speciality}</div>}
                        {referral.phoneNo && <div>Phone: +91 {referral.phoneNo}</div>}
                        {referral.purpose && <div>Purpose: {referral.purpose}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PastVisits;
