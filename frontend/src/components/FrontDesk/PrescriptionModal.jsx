import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Phone, MessageCircle, Printer, Loader } from 'lucide-react';
import doctorService from '../../services/doctorService';

const PrescriptionModal = ({ appointment, onClose }) => {
  const [email, setEmail]   = useState(appointment?.patient?.email || '');
  const [phone, setPhone]   = useState(appointment?.patient?.phone || '');
  const [consult, setConsult] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const patient   = appointment?.patient || {};
  const patientId = patient.patientId || '';
  const name      = patient.name || 'Unknown';
  const age       = patient.age  || '';
  const gender    = patient.gender || '';
  const dateStr   = appointment?.date
    ? new Date(appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  useEffect(() => {
    const fetchConsultation = async () => {
      if (!appointment?._id) { setLoading(false); return; }
      try {
        const data = await doctorService.getConsultation(appointment._id);
        setConsult(data);
      } catch (err) {
        console.error('Could not fetch consultation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsultation();
  }, [appointment?._id]);

  /* ─── Print: open new window with only prescription HTML ─── */
  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=1000');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription — ${name}</title>
          <meta charset="utf-8"/>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"/>
          <style>
            body { margin: 0; padding: 15mm; font-family: Arial, sans-serif; }
            @media print { body { margin: 0; } }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px 10px; border: 1px solid #dee2e6; font-size: 13px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  /* ─── Email: open mailto ─────────────────────────────────── */
  const handleEmail = () => {
    if (!email.trim()) { alert('Please enter an email address.'); return; }
    const subject = encodeURIComponent(`Prescription for ${name} — ${dateStr}`);
    const meds = (consult?.medicines || []).map(m =>
      `• ${m.name} ${m.dosage || ''} ${m.frequency || ''} for ${m.duration || ''}`).join('\n');
    const body = encodeURIComponent(
      `Dear ${name},\n\nPlease find below your prescription summary dated ${dateStr}:\n\n` +
      (consult?.chiefComplaints?.length ? `Complaints: ${consult.chiefComplaints.join(', ')}\n` : '') +
      (consult?.diagnosis?.length ? `Diagnosis: ${consult.diagnosis.join(', ')}\n\n` : '\n') +
      (meds ? `Medications:\n${meds}\n\n` : '') +
      `Doctor: DR. ASWINI RANA\nClinic Phone: 9002535240\n\nPlease contact us for any queries.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  /* ─── WhatsApp: open wa.me link ──────────────────────────── */
  const handleWhatsApp = () => {
    const rawPhone = phone.replace(/\D/g, '');
    if (!rawPhone || rawPhone.length < 10) { alert('Please enter a valid phone number.'); return; }
    const num = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone.slice(-10)}`;
    const meds = (consult?.medicines || []).map(m =>
      `• ${m.name} ${m.dosage || ''} ${m.frequency || ''} for ${m.duration || ''}`).join('\n');
    const msg = encodeURIComponent(
      `*Prescription — ${name} (${dateStr})*\n` +
      (consult?.diagnosis?.length ? `*Diagnosis:* ${consult.diagnosis.join(', ')}\n` : '') +
      (meds ? `\n*Medications:*\n${meds}\n` : '') +
      `\n_DR. ASWINI RANA | 9002535240_`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '90vw', height: '90vh' }}>
        <div className="modal-content h-100">

          {/* Header */}
          <div className="modal-header py-2">
            <h5 className="modal-title fs-6">Print Preview (1 Page)</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-0 d-flex overflow-hidden bg-light">

            {/* Left: Preview */}
            <div className="flex-grow-1 overflow-auto d-flex justify-content-center p-4" style={{ backgroundColor: '#e9ecef' }}>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center w-100">
                  <Loader size={24} className="text-muted me-2" style={{ animation: 'spin 1s linear infinite' }} />
                  <span className="text-muted">Loading prescription…</span>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className="bg-white shadow-sm border"
                  style={{ width: '210mm', minHeight: '297mm', padding: '15mm', margin: '0 auto' }}
                >
                  {/* Clinic Header */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h2 className="fw-bold mb-1" style={{ color: '#0d6efd' }}>DR. ASWINI RANA</h2>
                      <div style={{ color: '#20c997', fontSize: '12px', lineHeight: '1.6', fontWeight: 500 }}>
                        MBBS(CAL), MD(MEDICINE), IPGMER<br/>
                        CCEBDM(DELHI) — Certificate in Diabetes Management<br/>
                        Consultant Physician &amp; Diabetologist<br/>
                        Ex Doctor AIIMS Kalyani | SSKM/PG Hospital<br/>
                        Reg no- 65941(WBMC)
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-primary" style={{ fontSize: '28px', fontStyle: 'italic', letterSpacing: '-1px' }}>ASR</div>
                      <div style={{ fontSize: '10px', color: '#6c757d' }}>Doctor Clinic</div>
                      <div className="d-flex align-items-center justify-content-end gap-2 mt-2" style={{ color: '#0d6efd' }}>
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>
                          <Phone size={13} fill="currentColor" />
                        </div>
                        <span className="fw-bold" style={{ fontSize: '1rem' }}>9002535240</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '2px dotted #0d6efd', margin: '12px 0' }}></div>

                  {/* Patient Info */}
                  <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '13px' }}>
                    <div className="fw-bold">{patientId}: {name.toUpperCase()} ({age}y, {gender})</div>
                    <div className="fw-bold"><span className="me-3">Date</span>: {dateStr}</div>
                  </div>

                  <div style={{ borderTop: '1px solid #dee2e6', margin: '10px 0' }}></div>

                  {/* Prescription Body */}
                  <div className="mt-3">
                    {/* Chief Complaints */}
                    {consult?.chiefComplaints?.length > 0 && (
                      <div className="mb-3">
                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chief Complaints</div>
                        <div style={{ fontSize: '13px' }}>{consult.chiefComplaints.join(' • ')}</div>
                      </div>
                    )}

                    {/* Diagnosis */}
                    {consult?.diagnosis?.length > 0 && (
                      <div className="mb-3">
                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diagnosis</div>
                        <div style={{ fontSize: '13px' }}>{consult.diagnosis.join(', ')}</div>
                      </div>
                    )}

                    {/* Medicines */}
                    {consult?.medicines?.length > 0 && (
                      <div className="mb-3">
                        <div className="fw-bold text-dark mb-2" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rx — Medicines</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>#</th>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Medicine</th>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Dosage</th>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Frequency</th>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Duration</th>
                              <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consult.medicines.map((m, i) => (
                              <tr key={i}>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{i + 1}</td>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{m.name}</td>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{m.dosage || '—'}</td>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{m.frequency || '—'}</td>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{m.duration || '—'}</td>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{m.instructions || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Advice / Notes */}
                    {consult?.advice && (
                      <div className="mb-3">
                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Advice</div>
                        <div style={{ fontSize: '13px' }}>{consult.advice}</div>
                      </div>
                    )}

                    {/* Follow-up */}
                    {consult?.followUpDate && (
                      <div className="mb-3">
                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Follow-up</div>
                        <div style={{ fontSize: '13px' }}>
                          {new Date(consult.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!consult?.medicines?.length && !consult?.chiefComplaints?.length && !consult?.diagnosis?.length && (
                      <div className="text-muted text-center mt-5" style={{ fontSize: '13px' }}>
                        No prescription data recorded for this visit.
                      </div>
                    )}
                  </div>

                  {/* Signature area */}
                  <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px dashed #dee2e6', marginTop: '60px' }}>
                    <div style={{ fontSize: '11px', color: '#6c757d', textAlign: 'right' }}>
                      <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>DR. ASWINI RANA</div>
                      <div>MBBS, MD — Physician &amp; Diabetologist</div>
                      <div>Reg no- 65941(WBMC)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="bg-white border-start d-flex flex-column" style={{ width: '320px' }}>
              <div className="p-4 flex-grow-1">

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Print Language</label>
                  <select className="form-select text-dark">
                    <option>English</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted border-end-0">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="form-control border-start-0 ps-0"
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">Phone Number (WhatsApp)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted border-end-0">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      className="form-control border-start-0 ps-0"
                      placeholder="10-digit number"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="p-3 border-top d-flex gap-2 justify-content-end bg-light">
                <button
                  className="btn btn-outline-success d-flex align-items-center gap-2 fw-bold bg-white"
                  onClick={handleWhatsApp}
                  disabled={loading}
                >
                  <MessageCircle size={16} />
                  WhatsApp/SMS
                </button>
                <button
                  className="btn btn-outline-primary d-flex align-items-center gap-2 fw-bold bg-white"
                  onClick={handleEmail}
                  disabled={loading}
                >
                  <Mail size={16} />
                  Email
                </button>
                <button
                  className="btn btn-primary d-flex align-items-center gap-2 fw-bold"
                  onClick={handlePrint}
                  disabled={loading}
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;
