import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import moment from 'moment';

const PrintPrescription = () => {
  const { appointmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [appointmentId]);

  const fetchData = async () => {
    try {
      const consultationData = await doctorService.getConsultation(appointmentId);
      setData(consultationData);
      setLoading(false);
      
      // Auto-trigger print dialog after a brief delay to ensure rendering is complete
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      console.error('Error fetching consultation for print', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-5 text-center">Preparing Prescription for Print...</div>;
  }

  if (!data) {
    return <div className="p-5 text-center text-danger">Error: Could not load prescription data.</div>;
  }

  const patientNameFormatted = `${data.patient?.name || 'Unknown'} (${data.patient?.age || '--'}y, ${data.patient?.gender || '-'})`;
  const formattedDate = moment(data.createdAt || Date.now()).format('DD-MMM-YYYY');

  return (
    <div id="hp-print-area" className="print-container bg-white mx-auto" style={{ fontFamily: '"Arial", sans-serif', color: '#000', maxWidth: '900px', padding: '20px 40px' }}>
      
      {/* --- Hide this button during actual printing --- */}
      <div className="d-print-none text-center mb-4 pb-3 border-bottom">
        <button className="btn btn-primary px-4 fw-bold shadow-sm" onClick={() => window.print()}>
          <i className="bi bi-printer-fill me-2"></i> Print Now
        </button>
        <div className="text-muted small mt-2">Make sure "Background graphics" is checked in print settings for colors!</div>
      </div>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h1 style={{ color: '#0056b3', fontWeight: '800', margin: 0, fontSize: '2.2rem', letterSpacing: '1px' }}>DR. ASWINI RANA</h1>
          <div style={{ color: '#00a8cc', fontSize: '0.9rem', lineHeight: '1.3', marginTop: '10px', fontWeight: '700' }}>
            MBBS(CAL),MD(MEDICINE),IPGMER<br/>
            CCEBDM(DELHI)-Certificate in Diabetes Management<br/>
            Consultant Physician & Diabetologist<br/>
            Ex Doctor AIIMS Kalyani<br/>
            SSKM/PG Hospital<br/>
            Reg no- 65941(WBMC)
          </div>
        </div>
        <div className="text-end mt-2">
          {/* Logo Placeholder */}
          <div style={{ display: 'inline-block', marginBottom: '15px' }}>
             <span style={{ fontSize: '3rem', fontWeight: '900', fontStyle: 'italic', color: '#0056b3', letterSpacing: '-3px', lineHeight: '1' }}>ASR</span>
             <div style={{ fontSize: '0.8rem', color: '#0056b3', fontWeight: 'bold', borderTop: '2px solid #00a8cc', marginTop: '2px', paddingTop: '2px' }}>Doctor Clinic</div>
          </div>
          <div className="d-flex align-items-center justify-content-end" style={{ color: '#0056b3', fontSize: '2rem', fontWeight: '800' }}>
            <i className="bi bi-telephone-fill me-2" style={{ fontSize: '1.6rem' }}></i>
            9002535240
          </div>
        </div>
      </div>
      
      {/* Dotted Line */}
      <div style={{ borderBottom: '3px dotted #0056b3', margin: '20px 0' }}></div>

      {/* Patient Info */}
      <div className="d-flex justify-content-between align-items-center fw-bold" style={{ fontSize: '0.95rem' }}>
        <div>{data.patient?.patientId || appointmentId.slice(-6)}: {patientNameFormatted.toUpperCase()}</div>
        <div>Date <span className="ms-4">: {formattedDate}</span></div>
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
                    <div className="fw-bold">Dr. {referral.doctorName}</div>
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
          <div style={{ height: '50px', width: '150px', backgroundColor: '#e9ecef', marginBottom: '5px', position: 'relative' }}>
             <span className="text-muted" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontStyle: 'italic', fontSize: '1.5rem', fontFamily: 'serif' }}>Rana</span>
          </div>
          <div className="fw-bold" style={{ fontSize: '1rem' }}>Dr. Aswini Rana,MD MEDICINE</div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center mt-5 pt-4">
         <div style={{ fontSize: '0.85rem' }}>Powered by ASR Clinic EMR</div>
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
