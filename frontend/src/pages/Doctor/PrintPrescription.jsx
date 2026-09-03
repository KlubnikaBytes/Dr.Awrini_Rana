import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, Loader2, Printer } from 'lucide-react';
import doctorService from '../../services/doctorService';
import clinicService from '../../services/clinicService';
import frontdeskService from '../../services/frontdeskService';
import { sendDocumentAsEmail } from '../../services/emailService';
import moment from 'moment';

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';

const PrintPrescription = () => {
  const { appointmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [clinicData, setClinicData] = useState(null);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const contentRef = useRef(null);
  const footerRef = useRef(null);
  const spacerRef = useRef(null);

  // Calculate exact spacer height to push footer to page bottom
  useEffect(() => {
    let timeoutId;
    
    const calcSpacer = () => {
      if (!contentRef.current || !footerRef.current || !spacerRef.current) return;
      
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const contentEl = contentRef.current;
        const footerEl = footerRef.current;
        const spacerEl = spacerRef.current;
        if (!contentEl || !footerEl || !spacerEl) return;

        // Use an effective aspect ratio slightly smaller than true A4 (297/210) to account for 
        // unprintable margins (approx 10-15mm top and bottom) that printers enforce.
        // 270 / 210 is a safer estimate for the available printable height.
        const contentW = contentEl.offsetWidth;
        const PAGE_HEIGHT_CSS = (270 / 210) * contentW;

        // Measure total height including padding, but excluding the current spacer
        const actualSpacerH = spacerEl.offsetHeight;
        const realContentHeight = contentEl.scrollHeight - actualSpacerH;
        
        // Find how much space is left on the current last page
        const lastPageUsed = realContentHeight % PAGE_HEIGHT_CSS;
        let spaceLeft = PAGE_HEIGHT_CSS - lastPageUsed;
        
        // Subtract a larger safety margin (40px) to ensure we don't accidentally
        // trigger a page break due to browser sub-pixel rendering differences
        setSpacerHeight(Math.max(0, spaceLeft - 40));
      }, 100);
    };

    calcSpacer();

    window.addEventListener('resize', calcSpacer);
    window.addEventListener('beforeprint', calcSpacer);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calcSpacer);
      window.removeEventListener('beforeprint', calcSpacer);
    };
  }, [data]);

  useEffect(() => {
    fetchData();
  }, [appointmentId]);

  const fetchData = async () => {
    try {
      const [consultationData, allClinics] = await Promise.all([
        doctorService.getConsultation(appointmentId),
        clinicService.getAllClinics().catch(() => [])
      ]);
      setData(consultationData);

      // Try to find the current clinic from stored clinic name/id
      const storedClinicName = localStorage.getItem('clinicName') || '';
      const storedClinicId = localStorage.getItem('clinicId') || '';
      const matched = allClinics.find(c =>
        c._id === storedClinicId ||
        c.name?.toLowerCase() === storedClinicName?.toLowerCase()
      ) || allClinics[0] || null;
      setClinicData(matched);

      setLoading(false);
      
      // Auto-trigger print dialog after a brief delay to ensure rendering is complete
      setTimeout(() => {
        if (window.location.search.includes('email=true')) {
          document.getElementById('btn-email-prescription')?.click();
        } else {
          window.print();
        }
      }, 500);
    } catch (error) {
      console.error('Error fetching consultation for print', error);
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    let targetEmail = data?.patient?.email;
    if (!targetEmail) {
      targetEmail = window.prompt("Patient does not have a registered email address. Please enter an email address to send the prescription:");
      if (!targetEmail) return;
      try {
        if (data?.patient?._id) {
          await frontdeskService.updatePatient(data.patient._id, { email: targetEmail });
          setData(prev => ({ ...prev, patient: { ...prev.patient, email: targetEmail } }));
        }
      } catch (err) { console.error("Could not save email", err); }
      await performEmailSend(targetEmail);
    } else {
      const newEmail = window.prompt("Confirm or change the email address to send the prescription:", targetEmail);
      if (!newEmail) return;
      if (newEmail !== targetEmail) {
        targetEmail = newEmail;
        try {
          if (data?.patient?._id) {
            await frontdeskService.updatePatient(data.patient._id, { email: targetEmail });
            setData(prev => ({ ...prev, patient: { ...prev.patient, email: targetEmail } }));
          }
        } catch (err) { console.error("Could not save email", err); }
      }
      await performEmailSend(targetEmail);
    }
  };

  const performEmailSend = async (emailAddr) => {
    setEmailing(true);
    try {
      const subject = `Your Prescription from ${clinicData?.name || 'Doctor'}`;
      const body = `<p>Dear ${data?.patient?.name || 'Patient'},</p><p>Please find attached your digital prescription from your recent visit.</p>`;
      
      await sendDocumentAsEmail('hp-print-area', emailAddr, subject, body, 'Prescription.pdf');
      alert(`Email successfully sent to ${emailAddr}`);
    } catch (err) {
      alert('Failed to send email. Ensure backend is configured properly.');
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return <div className="p-5 text-center">Preparing Prescription for Print...</div>;
  }

  if (!data) {
    return <div className="p-5 text-center text-danger">Error: Could not load prescription data.</div>;
  }

  const doctor = data.doctor || {};
  const rawName = (doctor.name || '').replace(/^dr\.?\s*/i, '').trim();
  const doctorName = rawName ? `DR. ${rawName.toUpperCase()}` : 'DOCTOR';
  const doctorQuals = doctor.qualifications || '';
  const doctorSpeciality = doctor.speciality || doctor.department || '';
  const doctorBio = doctor.bio || '';
  const doctorRegNo = doctor.registrationNo || '';
  const doctorPhone = doctor.contactForPrescription || doctor.phone || '';
  const doctorSignature = doctor.signatureImage || '';
  const clinicName = clinicData?.name || localStorage.getItem('clinicName') || 'mediplix';
  const clinicPhone = clinicData?.phone || doctorPhone || '9002535240'; // clinic phone shown in header
  const rawLogoPath = clinicData?.logo || null;
  const clinicLogo = rawLogoPath
    ? `${API_BASE}/${rawLogoPath.replace(/^\/+/, '')}` // strip leading slashes then join cleanly
    : null;

  return (
    <div id="hp-print-area" ref={contentRef} className="bg-white mx-auto" style={{ fontFamily: '"Arial", sans-serif', color: '#000', maxWidth: '900px', padding: '12mm 15mm' }}>
      <style>{`
        @page { margin: 0; size: A4; }
        @media print {
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #hp-print-area { padding: 12mm 15mm !important; }
        }
      `}</style>
      
      {/* --- Hide this button during actual printing --- */}
      <div className="d-print-none text-center mb-4 pb-3 border-bottom d-flex justify-content-center gap-3">
        <button className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={() => window.print()} disabled={emailing}>
          <Printer size={18} /> Print Prescription
        </button>
        <button id="btn-email-prescription" className="btn btn-outline-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={handleEmail} disabled={emailing}>
          {emailing ? <Loader2 size={18} className="spin" /> : <Mail size={18} />} 
          {emailing ? 'Sending...' : 'Email to Patient'}
        </button>
      </div>
      <div className="d-print-none text-muted small text-center mb-4 mt-n3">Make sure "Background graphics" is checked in print settings for colors!</div>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h1 style={{ color: '#0056b3', fontWeight: '800', margin: 0, fontSize: '2.2rem', letterSpacing: '1px' }}>{doctorName}</h1>
          <div style={{ color: '#00a8cc', fontSize: '0.9rem', lineHeight: '1.5', marginTop: '10px', fontWeight: '700' }}>
            {doctorQuals && <div>{doctorQuals}</div>}
            {doctorSpeciality && <div>{doctorSpeciality}</div>}
            {doctorBio && <div>{doctorBio}</div>}
            {doctorRegNo && <div>{doctorRegNo}</div>}
          </div>
        </div>
        <div className="text-end mt-2">
          <div style={{ display: 'inline-block', marginBottom: '15px' }}>
            {clinicLogo && (
              <img
                src={clinicLogo}
                alt={clinicName}
                onError={(e) => {
                  e.target.style.display = 'none';
                  // Show the text fallback sibling
                  const fallback = e.target.parentNode.querySelector('.clinic-name-fallback');
                  if (fallback) fallback.style.display = 'block';
                }}
                style={{ maxHeight: '100px', maxWidth: '240px', objectFit: 'contain', display: 'block', marginLeft: 'auto' }}
              />
            )}
            <div
              className="clinic-name-fallback"
              style={{ display: clinicLogo ? 'none' : 'block' }}
            >
              <span style={{ fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', color: '#0056b3', letterSpacing: '-1px', lineHeight: '1' }}>
                {clinicName}
              </span>
              <div style={{ fontSize: '0.8rem', color: '#0056b3', fontWeight: 'bold', borderTop: '2px solid #00a8cc', marginTop: '2px', paddingTop: '2px' }}>Doctor Clinic</div>
            </div>
          </div>
          {clinicPhone && (
            <div className="d-flex align-items-center justify-content-end" style={{ color: '#0056b3', fontSize: '1.4rem', fontWeight: '800' }}>
              <Phone size={20} className="me-2" />
              {clinicPhone}
            </div>
          )}
        </div>
      </div>
      
      {/* Dotted Line */}
      <div style={{ borderBottom: '3px dotted #0056b3', margin: '20px 0' }}></div>

      {/* Patient Info Row */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>
        <span>
          NAME :&nbsp;
          <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3, letterSpacing: 0.5 }}>
            {(data.patient?.name || 'Unknown').toUpperCase()}
          </span>
        </span>
        <span>
          AGE/SEX :&nbsp;
          <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {data.patient?.age || '--'}Y / {(data.patient?.gender || '-').toUpperCase()}
          </span>
        </span>
        <span style={{ marginLeft: 'auto' }}>
          DATE :&nbsp;
          <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {moment(data.createdAt || Date.now()).format('DD-MMM-YYYY')}
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>
        <span>ID: {data.patient?.patientId || appointmentId.slice(-6)}</span>
        {data.patient?.phone && <span>Ph: {data.patient.phone}</span>}
      </div>

      <div style={{ borderBottom: '1px solid #dee2e6', margin: '10px 0 15px 0' }}></div>

      {/* Vitals */}
      {data.vitals && (
        <div className="mb-1 d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: '0.85rem', color: '#000', pageBreakInside: 'avoid' }}>
          {data.vitals.bpSystolic && <span><strong>BP</strong> {data.vitals.bpSystolic}/{data.vitals.bpDiastolic} mmHg <span className="mx-2 text-dark">|</span></span>}
          {data.vitals.pulse && <span><strong>Pulse</strong> {data.vitals.pulse} bpm <span className="mx-2 text-dark">|</span></span>}
          {data.vitals.weight && <span><strong>Weight</strong> {data.vitals.weight} kg <span className="mx-2 text-dark">|</span></span>}
          {data.vitals.spo2 && <span><strong>SPO2</strong> {data.vitals.spo2} %</span>}
        </div>
      )}

      {/* Complaints */}
      {data.complaints && data.complaints.length > 0 && (
        <div className="mb-1" style={{ pageBreakInside: 'avoid' }}>
          <div className="fw-bold text-decoration-underline mb-0" style={{ fontSize: '0.9rem', color: '#000' }}>Complaints:</div>
          <div style={{ fontSize: '0.85rem', paddingLeft: '8px', lineHeight: '1.2', color: '#000' }}>
            {data.complaints.map((c, i) => (
              <div key={i}>&bull; {c.toUpperCase()}</div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      {data.diagnosis && data.diagnosis.length > 0 && (
        <div className="mb-1 mt-1" style={{ pageBreakInside: 'avoid' }}>
          <span className="fw-bold text-decoration-underline text-uppercase" style={{ fontSize: '0.9rem', color: '#000' }}>
            Diagnosis: {data.diagnosis.join(', ')}
          </span>
        </div>
      )}

      {/* Rx Symbol */}
      <div className="mb-0 mt-1" style={{ fontSize: '1.5rem', lineHeight: '1', color: '#000' }}>
        &#8478;
      </div>

      {/* Medicine Table */}
      {data.medicines && data.medicines.length > 0 && (
        <>
          <table className="table table-borderless table-sm mb-1" style={{ borderCollapse: 'collapse', width: '100%', color: '#000' }}>
            <thead>
              <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th className="fw-bold px-0 py-0" style={{ width: '45%', fontSize: '0.85rem', color: '#000' }}>Medicine</th>
                <th className="fw-bold px-0 py-0 text-center" style={{ width: '20%', fontSize: '0.85rem', color: '#000' }}>Dosage</th>
                <th className="fw-bold px-0 py-0 text-center" style={{ width: '35%', fontSize: '0.85rem', color: '#000' }}>Timing - Freq. - Duration</th>
              </tr>
            </thead>
            {data.medicines.map((med, index) => {
              const hasSubDetails = med.genericName || med.when || med.notes;
              return (
                <tbody key={index} style={{ pageBreakInside: 'avoid' }}>
                  <tr>
                    <td className="px-0 py-0 pt-1 align-top fw-bold" style={{ fontSize: '0.85rem', color: '#000' }}>
                      {index + 1}) {med.type} {med.medicineName.toUpperCase()} *
                    </td>
                    <td className="px-0 py-0 pt-1 align-top text-center" style={{ fontSize: '0.85rem', color: '#000' }}>
                      {med.dosage ? med.dosage.split('-').join(' - ') : ''}
                    </td>
                    <td className="px-0 py-0 pt-1 align-top text-center" style={{ fontSize: '0.85rem', color: '#000' }}>
                      {med.when ? med.when + ' - ' : ''}{med.frequency ? med.frequency + ' - ' : ''}{med.duration || ''}
                    </td>
                  </tr>
                  {/* Medicine Sub-details */}
                  {hasSubDetails && (
                    <tr style={{ borderBottom: index < data.medicines.length - 1 ? '1px solid #ccc' : 'none' }}>
                      <td colSpan="3" className="px-0 pb-1 align-top" style={{ paddingLeft: '22px', color: '#000' }}>
                        {med.genericName && (
                          <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>
                            Composition : {med.genericName}
                          </div>
                        )}
                        {med.when && (
                          <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>
                            Timing &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 1 {med.when}
                          </div>
                        )}
                        {med.notes && (
                          <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>
                            Notes &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {med.notes.toUpperCase()}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {!hasSubDetails && index < data.medicines.length - 1 && (
                    <tr style={{ borderBottom: '1px solid #ccc' }}><td colSpan="3" className="p-0"></td></tr>
                  )}
                </tbody>
              );
            })}
          </table>
          <div style={{ borderTop: '1px solid #000', marginBottom: '5px' }}></div>
        </>
      )}

      {/* Advice */}
      {data.advice && (
        <div className="mb-1" style={{ fontSize: '0.85rem', color: '#000', whiteSpace: 'pre-wrap', pageBreakInside: 'avoid' }}>
          <span className="fw-bold">Advice:</span> <span className="text-uppercase">{data.advice}</span>
        </div>
      )}

      {/* Tests Prescribed */}
      {data.testsRequested && data.testsRequested.length > 0 && (
        <div className="mb-1" style={{ fontSize: '0.85rem', color: '#000', pageBreakInside: 'avoid' }}>
          <span className="fw-bold">Tests Prescribed:</span>{' '}
          <span className="text-uppercase">
            {data.testsRequested.map(t => {
              const name = typeof t === 'string' ? t : t.testName;
              const instr = typeof t === 'string' ? '' : t.instruction;
              if (!name) return null;
              return instr ? `${name} (${instr})` : name;
            }).filter(Boolean).join(' , ')}
          </span>
        </div>
      )}

      {/* Next Visit */}
      {data.nextVisit && (data.nextVisit.value || data.nextVisit.date) && (
        <div className="mb-1" style={{ fontSize: '0.85rem', color: '#000', pageBreakInside: 'avoid' }}>
          <span className="fw-bold">Next Visit:</span>{' '}
          <span className="text-uppercase">
             {data.nextVisit.date 
               ? moment(data.nextVisit.date).format('DD-MMM-YYYY') 
               : `${data.nextVisit.value} ${data.nextVisit.unit}`
             }
          </span>
        </div>
      )}

      {/* Referred To */}
      {data.referredTo && data.referredTo.some(r => r.doctorName) && (
        <div className="mb-1" style={{ fontSize: '0.85rem', color: '#000', pageBreakInside: 'avoid' }}>
          <span className="fw-bold">Referred To:</span>{' '}
          <span className="text-uppercase">
            {data.referredTo.filter(r => r.doctorName).map(r => {
              const name = `Dr. ${r.doctorName.replace(/^dr\.?\s*/i, '').trim()}`;
              const parts = [name];
              if (r.speciality) parts.push(r.speciality);
              if (r.phoneNo) parts.push(`Ph: +91 ${r.phoneNo}`);
              if (r.purpose) parts.push(`Purpose: ${r.purpose}`);
              return parts.join(' - ');
            }).join(' , ')}
          </span>
        </div>
      )}

      {/* Signature Area */}
      <div className="d-flex justify-content-end mt-4 pt-3 mb-2" style={{ pageBreakInside: 'avoid' }}>
        <div className="text-center">
          {doctorSignature ? (
            <img src={doctorSignature} alt="Doctor Signature" style={{ height: '50px', maxWidth: '160px', objectFit: 'contain', marginBottom: '2px', display: 'block' }} />
          ) : (
            <div style={{ height: '40px', width: '160px', borderBottom: '2px solid #333', marginBottom: '2px' }}></div>
          )}
          <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#000' }}>{rawName ? `Dr. ${rawName}` : 'Doctor'}</div>
          {doctorQuals && <div style={{ fontSize: '0.75rem', color: '#555' }}>{doctorQuals.split(',')[0]}</div>}
        </div>
      </div>

      {/* Dynamic spacer — pushes footer to bottom of last page during print */}
      <div ref={spacerRef} style={{ height: spacerHeight }} aria-hidden="true" />

      {/* Footer Branding */}
      <div ref={footerRef} className="text-center pt-2 pb-2" style={{ pageBreakInside: 'avoid' }}>
         <div className="fw-bold p-1 mb-1 mx-auto" style={{ color: '#0056b3', border: '1px solid #0056b3', fontSize: '0.8rem', width: '90%' }}>
            DOCTOR CONSULTATION : DAY CARE : HOME CARE : ECG : HOLTER MONITOR : BLOOD TEST : VACCINATION : X-RAY : USG
         </div>
         <div style={{ fontSize: '0.75rem' }}>Powered by Klubnika Bytes (www.klubnikabytes.com)</div>
      </div>

    </div>
  );
};

export default PrintPrescription;
