import React, { useState, useEffect } from 'react';
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
    <div id="hp-print-area" className="print-container bg-white mx-auto" style={{ fontFamily: '"Arial", sans-serif', color: '#000', maxWidth: '900px', padding: '20px 40px' }}>
      
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
        <div className="fw-bold mb-3 d-flex flex-wrap gap-2" style={{ fontSize: '1rem' }}>
          {data.vitals.bpSystolic && <span>BP <span style={{ fontWeight: 'normal' }}>{data.vitals.bpSystolic}/{data.vitals.bpDiastolic} mmHg</span> <span className="mx-2 text-muted">|</span></span>}
          {data.vitals.pulse && <span>Pulse <span style={{ fontWeight: 'normal' }}>{data.vitals.pulse} bpm</span> <span className="mx-2 text-muted">|</span></span>}
          {data.vitals.weight && <span>Weight <span style={{ fontWeight: 'normal' }}>{data.vitals.weight} kg</span> <span className="mx-2 text-muted">|</span></span>}
          {data.vitals.spo2 && <span>SPO2 <span style={{ fontWeight: 'normal' }}>{data.vitals.spo2} %</span></span>}
        </div>
      )}

      {/* Complaints */}
      {data.complaints && data.complaints.length > 0 && (
        <div className="mb-3">
          <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Complaints:</div>
          <div style={{ fontSize: '0.95rem', paddingLeft: '8px' }}>
            {data.complaints.map((c, i) => (
              <div key={i}>&bull; {c.toUpperCase()}</div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      {data.diagnosis && data.diagnosis.length > 0 && (
        <div className="mb-4 d-flex align-items-start gap-1">
          <div className="fw-bold text-decoration-underline" style={{ fontSize: '1.1rem' }}>Diagnosis:</div>
          <div className="fw-bold text-decoration-underline text-uppercase" style={{ fontSize: '1.1rem' }}>
             {data.diagnosis.join(' , ')}
          </div>
        </div>
      )}

      {/* Rx Symbol */}
      <div className="mb-2" style={{ fontSize: '2rem', lineHeight: '1' }}>
        &#8472;
      </div>

      <div style={{ borderBottom: '2px solid #333', margin: '10px 0' }}></div>

      {/* Medicine Table */}
      {data.medicines && data.medicines.length > 0 && (
        <table className="table table-borderless table-sm mb-4" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dee2e6' }}>
              <th className="fw-bold px-0 py-2" style={{ width: '45%', fontSize: '1rem', color: '#000' }}>Medicine</th>
              <th className="fw-bold px-0 py-2 text-center" style={{ width: '20%', fontSize: '1rem', color: '#000' }}>Dosage</th>
              <th className="fw-bold px-0 py-2" style={{ width: '35%', fontSize: '1rem', color: '#000' }}>Timing - Freq. - Duration</th>
            </tr>
          </thead>
          <tbody>
            {data.medicines.map((med, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="px-0 py-1 pt-2 align-top fw-bold" style={{ fontSize: '1.05rem', color: '#000' }}>
                    {index + 1}) {med.type} {med.medicineName.toUpperCase()}
                  </td>
                  <td className="px-0 py-1 pt-2 align-top text-center" style={{ fontSize: '1.05rem', color: '#000' }}>
                    {med.dosage ? med.dosage.split('').join(' \u2013 ') : ''}
                  </td>
                  <td className="px-0 py-1 pt-2 align-top" style={{ fontSize: '1.05rem', color: '#000' }}>
                    {med.when} - {med.frequency} - {med.duration}
                  </td>
                </tr>
                {/* Medicine Sub-details (Composition / Timing / Notes) */}
                {(med.genericName || med.when || med.notes) && (
                  <tr>
                    <td colSpan="3" className="px-0 pb-2 align-top" style={{ paddingLeft: '25px', color: '#000' }}>
                      {med.genericName && (
                        <div style={{ fontSize: '0.9rem', marginBottom: '2px' }}>
                          Composition : {med.genericName}
                        </div>
                      )}
                      {med.when && (
                        <div style={{ fontSize: '0.9rem', marginBottom: '2px' }}>
                          Timing &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 1 {med.when}
                        </div>
                      )}
                      {med.notes && (
                        <div style={{ fontSize: '0.9rem' }}>
                          Notes &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {med.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {data.medicines && data.medicines.length > 0 && (
         <div style={{ borderTop: '2px solid #dee2e6', marginBottom: '15px' }}></div>
      )}

      {/* Tests Prescribed */}
      {data.testsRequested && data.testsRequested.length > 0 && (
        <div className="mb-3">
          <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Tests Prescribed:</div>
          <div className="fw-bold" style={{ fontSize: '1.1rem', paddingLeft: '8px' }}>
            {data.testsRequested.map((t, index) => {
              const name = typeof t === 'string' ? t : t.testName;
              const instr = typeof t === 'string' ? '' : t.instruction;
              if (!name) return null;
              return (
                <div key={index}>
                  &bull; {name.toUpperCase()} 
                  {instr && <span style={{ fontWeight: 'normal', fontStyle: 'italic', marginLeft: '10px' }}>- {instr}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Visit */}
      {data.nextVisit && (data.nextVisit.value || data.nextVisit.date) && (
        <div className="mb-5 d-flex align-items-start gap-1">
          <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Next Visit :</div>
          <div style={{ fontSize: '1.1rem' }}>
             {data.nextVisit.date 
               ? moment(data.nextVisit.date).format('DD-MMM-YYYY') 
               : `${data.nextVisit.value} ${data.nextVisit.unit}`
             }
          </div>
        </div>
      )}

      {/* Referred To */}
      {data.referredTo && data.referredTo.some(r => r.doctorName) && (
        <div className="mb-5">
          <div className="fw-bold" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Referred To:</div>
          <table className="table table-sm table-borderless" style={{ fontSize: '1rem', color: '#000', marginBottom: 0 }}>
            <tbody>
              {data.referredTo.filter(r => r.doctorName).map((referral, index) => (
                <tr key={index}>
                  <td className="px-0 py-1" style={{ width: '5%', verticalAlign: 'top' }}>{index + 1}.</td>
                  <td className="px-0 py-1" style={{ verticalAlign: 'top' }}>
                    <div className="fw-bold">Dr. {referral.doctorName.replace(/^dr\.?\s*/i, '').trim()}</div>
                    {referral.speciality && <div style={{ fontSize: '0.95rem' }}>{referral.speciality}</div>}
                    {referral.phoneNo && <div style={{ fontSize: '0.95rem' }}>Ph: +91 {referral.phoneNo}</div>}
                    {referral.purpose && <div style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>Purpose: {referral.purpose}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature Area */}
      <div className="d-flex justify-content-end mt-5 pt-5 mb-5">
        <div className="text-center">
          {doctorSignature ? (
            <img src={doctorSignature} alt="Doctor Signature" style={{ height: '60px', maxWidth: '180px', objectFit: 'contain', marginBottom: '5px', display: 'block' }} />
          ) : (
            <div style={{ height: '50px', width: '180px', borderBottom: '2px solid #333', marginBottom: '5px' }}></div>
          )}
          <div className="fw-bold" style={{ fontSize: '1rem' }}>{rawName ? `Dr. ${rawName}` : 'Doctor'}</div>
          {doctorQuals && <div style={{ fontSize: '0.8rem', color: '#555' }}>{doctorQuals.split(',')[0]}</div>}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center mt-5 pt-4">
         <div style={{ fontSize: '0.85rem' }}>Powered by Klubnika Bytes(www.klubnikabytes.com)</div>
         <div className="fw-bold my-1" style={{ color: '#dc3545', fontSize: '0.9rem' }}>
            In emergency please contact your nearest hospital.<br/>
            CB 95,ST NO 211, Newtown AA1,.
         </div>
         <div className="fw-bold p-1 mt-2 mx-auto" style={{ color: '#0056b3', border: '1px solid #0056b3', fontSize: '0.85rem', width: '90%' }}>
            DOCTOR CONSULTATION:DAY CARE:ECG:BLOOD TEST:INJECTION/SALINE:IMMUNIZATION
         </div>
      </div>

    </div>
  );
};

export default PrintPrescription;
