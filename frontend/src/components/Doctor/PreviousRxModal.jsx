import React from 'react';
import { X, Copy, Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';

const PreviousRxModal = ({ isOpen, onClose, pastConsultations, onCopyRx }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content shadow" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="modal-header bg-white border-bottom" style={{ padding: '16px 24px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h5 className="modal-title fw-bold" style={{ color: '#1e293b' }}>Previous Rx</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            
            <div className="modal-body p-0" style={{ backgroundColor: '#f8fafc' }}>
              {(!pastConsultations || pastConsultations.length === 0) ? (
                <div className="text-center p-5 text-secondary">
                  No previous prescriptions found for this patient.
                </div>
              ) : (
                <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {pastConsultations.map((visit, index) => {
                    const visitDate = moment(visit.createdAt);
                    const daysAgo = moment().diff(visitDate, 'days');
                    const medicines = visit.medicines || [];

                    return (
                      <div key={visit._id} className="bg-white rounded shadow-sm border border-light overflow-hidden">
                        {/* Visit Header */}
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ backgroundColor: '#fff' }}>
                          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: '#334155', fontSize: '1.05rem' }}>
                            <CalendarIcon size={18} className="text-secondary" />
                            {visitDate.format('DD-MMM-YYYY')}
                            <span className="text-muted fw-normal fs-6 ms-1">({daysAgo} days ago)</span>
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 fw-semibold"
                            style={{ borderRadius: '6px' }}
                            onClick={() => onCopyRx(visit)}
                          >
                            <Copy size={14} /> Copy Rx
                          </button>
                        </div>

                        {/* Medicines Table */}
                        {medicines.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                              <thead style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                  <th className="py-2 px-3 fw-semibold">Medicine</th>
                                  <th className="py-2 px-3 fw-semibold">Dosage</th>
                                  <th className="py-2 px-3 fw-semibold">When</th>
                                  <th className="py-2 px-3 fw-semibold">Frequency</th>
                                  <th className="py-2 px-3 fw-semibold">Duration</th>
                                  <th className="py-2 px-3 fw-semibold">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {medicines.map((med, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx !== medicines.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td className="py-3 px-3">
                                      <div className="fw-bold" style={{ color: '#1e293b' }}>{med.medicineName || '—'}</div>
                                      {(med.genericName || med.instructions) && (
                                        <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                                          {med.genericName} {med.genericName && med.instructions ? '•' : ''} {med.instructions}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 align-middle text-secondary">{med.dosage || '—'}</td>
                                    <td className="py-3 px-3 align-middle text-secondary">{med.when || '—'}</td>
                                    <td className="py-3 px-3 align-middle text-secondary">{med.frequency || '—'}</td>
                                    <td className="py-3 px-3 align-middle text-secondary">{med.duration || '—'}</td>
                                    <td className="py-3 px-3 align-middle text-secondary">{med.notes || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-3 text-secondary small text-center bg-light">
                            No medicines prescribed in this visit.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PreviousRxModal;
