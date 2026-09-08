import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, Loader2, Printer } from 'lucide-react';
import doctorService from '../../services/doctorService';
import clinicService from '../../services/clinicService';
import frontdeskService from '../../services/frontdeskService';
import printConfigService from '../../services/printConfigService';
import { sendDocumentAsEmail } from '../../services/emailService';
import moment from 'moment';

const DEFAULT_CFG = {
  fontFamily: 'Arial', fontSize: 12,
  printMarginLeft: 50, printMarginRight: 50,
  printMarginHeaderHeight: 275, printMarginFooterHeight: 60,
  headerImage: null, footerImage: null,
  useOwnLetterhead: false, printHeaderFirstPageOnly: true,
  printSignatureImage: false, signatureHeightCm: 45,
  printSignatureText: true, signatureText: '',
  printGenericName: true, tabularPrint: false,
  showPatientPhone: false, showPatientAddress: true,
  showReferredBy: false, showChannelThrough: false,
  showDepartment: false, showDoctorName: false,
  showVisitNumber: false, showPrintTime: false,
  showValidTill: false, showAbhaNumber: false,
  patientDetailFormat: 'single', capitalizePatientName: true,
};

const API_BASE = import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.replace('/api', '') || window.location.origin) : 'http://localhost:5000';

// A4 safe pixel height (297mm approx = 1122px). 
// With 12mm top/bottom padding (24mm = ~90px), max usable height is ~1030px.
// We set safe limit to 920px to leave room for the footer on the last page safely.
const PAGE_MAX_HEIGHT = 920; 

const PrintPrescription = () => {
  const { appointmentId } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [clinicData, setClinicData] = useState(null);
  const [pCfg, setPCfg]         = useState(DEFAULT_CFG);
  
  // Pagination state
  const [pages, setPages]       = useState(null); // null means we are currently measuring

  useEffect(() => {
    fetchData();
  }, [appointmentId]);

  const fetchData = async () => {
    try {
      const [consultationData, allClinics, savedConfig] = await Promise.all([
        doctorService.getConsultation(appointmentId),
        clinicService.getAllClinics().catch(() => []),
        printConfigService.getPrintConfig(null).catch(() => null),
      ]);
      setData(consultationData);

      if (savedConfig) {
        setPCfg(prev => ({ ...prev, ...savedConfig }));
      }

      const storedClinicName = localStorage.getItem('clinicName') || '';
      const storedClinicId = localStorage.getItem('clinicId') || '';
      const matched = allClinics.find(c =>
        c._id === storedClinicId || c.name?.toLowerCase() === storedClinicName?.toLowerCase()
      ) || allClinics[0] || null;
      setClinicData(matched);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching consultation for print', error);
      setLoading(false);
    }
  };

  // ── 1. DEFINE BLOCKS ───────────────────────────────────────────────────────
  // We break the prescription down into logical pieces so they can be paginated.
  let rawBlocks = [];
  
  if (data) {
    rawBlocks.push({ id: 'header', type: 'header' });
    rawBlocks.push({ id: 'patientInfo', type: 'patientInfo' });
    if (data.vitals) rawBlocks.push({ id: 'vitals', type: 'vitals' });
    if (data.complaints?.length) rawBlocks.push({ id: 'complaints', type: 'complaints' });
    if (data.diagnosis?.length) rawBlocks.push({ id: 'diagnosis', type: 'diagnosis' });
    rawBlocks.push({ id: 'rxSymbol', type: 'rxSymbol' });
    
    if (data.medicines?.length) {
      rawBlocks.push({ id: 'medsHeader', type: 'medsHeader' });
      data.medicines.forEach((med, i) => {
        rawBlocks.push({ id: `med-${i}`, type: 'medicine', data: med, index: i, isLast: i === data.medicines.length - 1 });
      });
      rawBlocks.push({ id: 'medsFooter', type: 'medsFooter' });
    }
    
    if (data.advice) rawBlocks.push({ id: 'advice', type: 'advice' });
    if (data.testsRequested?.length) rawBlocks.push({ id: 'tests', type: 'tests' });
    if (data.nextVisit && (data.nextVisit.value || data.nextVisit.date)) rawBlocks.push({ id: 'nextVisit', type: 'nextVisit' });
    if (data.referredTo?.some(r => r.doctorName)) rawBlocks.push({ id: 'referredTo', type: 'referredTo' });
    rawBlocks.push({ id: 'signature', type: 'signature' });
  }

  // ── 2. MEASURE AND PAGINATE ───────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!loading && data && pages === null) {
      // Small timeout to ensure images (if any) are in DOM before measuring
      setTimeout(() => {
        const container = document.getElementById('measure-container');
        if (!container) return;
        
        const children = container.children;
        const heights = Array.from(children).map(node => node.offsetHeight);
        
        let currentPages = [];
        let currentPage = [];
        let currentHeight = 0;
        
        for (let i = 0; i < rawBlocks.length; i++) {
          const h = heights[i] || 0;
          
          // Force header to always be top of page 1
          if (i === 0) {
            currentPage.push(rawBlocks[i]);
            currentHeight += h;
            continue;
          }
          
          if (currentHeight + h > PAGE_MAX_HEIGHT) {
            // Push current page and start a new one
            currentPages.push(currentPage);
            currentPage = [rawBlocks[i]];
            currentHeight = h;
          } else {
            currentPage.push(rawBlocks[i]);
            currentHeight += h;
          }
        }
        
        if (currentPage.length > 0) {
          currentPages.push(currentPage);
        }
        
        setPages(currentPages);
        
        // Auto-print after a tiny delay for final render
        setTimeout(() => {
          if (window.location.search.includes('email=true')) {
            document.getElementById('btn-email-prescription')?.click();
          } else {
            window.print();
          }
        }, 300);
      }, 300);
    }
  }, [loading, data, pages, rawBlocks]);

  // ── 3. RENDERERS ──────────────────────────────────────────────────────────
  
  // Doctor/Clinic extracted data
  const doctor = data?.doctor || {};
  const rawName = (doctor.name || '').replace(/^dr\.?\s*/i, '').trim();
  const doctorName = rawName ? `DR. ${rawName.toUpperCase()}` : 'DOCTOR';
  const doctorQuals = doctor.qualifications || '';
  const doctorSpeciality = doctor.speciality || doctor.department || '';
  const doctorBio = doctor.bio || '';
  const doctorRegNo = doctor.registrationNo || '';
  const doctorPhone = doctor.contactForPrescription || doctor.phone || '';
  const doctorSignature = doctor.signatureImage || '';
  
  const clinicName = clinicData?.name || localStorage.getItem('clinicName') || 'mediplix';
  const clinicPhone = clinicData?.phone || doctorPhone || '9002535240';
  const clinicLogo = clinicData?.logo ? `${API_BASE}/${clinicData.logo.replace(/^\/+/, '')}` : null;

  const printFont     = pCfg.fontFamily || 'Arial';
  const printFontSize = pCfg.fontSize || 12;
  const sigText       = pCfg.signatureText || (rawName ? `Dr. ${rawName}` : 'Doctor');
  const patientName   = pCfg.capitalizePatientName ? (data?.patient?.name || 'Unknown').toUpperCase() : (data?.patient?.name || 'Unknown');
  const headerImgSrc  = (!pCfg.useOwnLetterhead && pCfg.headerImage) ? pCfg.headerImage : null;
  const footerImgSrc  = pCfg.footerImage || null;

  const renderBlock = (block, pageIndex = 0) => {
    switch (block.type) {
      case 'header':
        // If printHeaderFirstPageOnly is true, only render header on page 0
        if (pCfg.printHeaderFirstPageOnly && pageIndex > 0) return <div style={{ height: '20px' }}></div>;
        
        return (
          <div className="mb-3">
            {headerImgSrc ? (
              <img src={headerImgSrc} alt="Header" style={{ width: '100%', height: '120px', objectFit: 'contain', marginBottom: 8, display: 'block' }} />
            ) : (
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
                      <img src={clinicLogo} alt={clinicName} style={{ height: '80px', maxWidth: '240px', objectFit: 'contain', display: 'block', marginLeft: 'auto' }} />
                    )}
                    <div style={{ display: clinicLogo ? 'none' : 'block' }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', color: '#0056b3', letterSpacing: '-1px', lineHeight: '1' }}>{clinicName}</span>
                      <div style={{ fontSize: '0.8rem', color: '#0056b3', fontWeight: 'bold', borderTop: '2px solid #00a8cc', marginTop: '2px', paddingTop: '2px' }}>Doctor Clinic</div>
                    </div>
                  </div>
                  {clinicPhone && (
                    <div className="d-flex align-items-center justify-content-end" style={{ color: '#0056b3', fontSize: '1.4rem', fontWeight: '800' }}>
                      <Phone size={20} className="me-2" />{clinicPhone}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div style={{ borderBottom: '3px dotted #0056b3', margin: '15px 0 10px' }}></div>
          </div>
        );

      case 'patientInfo':
        return (
          <div className="mb-3">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', fontSize: `${printFontSize * 0.079}rem`, fontWeight: 700, marginBottom: 4, flexWrap: pCfg.patientDetailFormat === 'multi' ? 'wrap' : 'nowrap' }}>
              <span>NAME : <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3, letterSpacing: 0.5 }}>{patientName}</span></span>
              <span>AGE/SEX : <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3 }}>{data.patient?.age || '--'}Y / {(data.patient?.gender || '-').toUpperCase()}</span></span>
              {pCfg.showPatientPhone && data.patient?.phone && <span>PH: <span style={{ fontWeight: 900, textDecoration: 'underline' }}>{data.patient.phone}</span></span>}
              {pCfg.showPatientAddress && data.patient?.address && <span>ADDR: <span style={{ fontWeight: 900 }}>{data.patient.address}</span></span>}
              <span style={{ marginLeft: 'auto' }}>DATE : <span style={{ fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 3 }}>{moment(data.createdAt || Date.now()).format('DD-MMM-YYYY')}</span></span>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', fontSize: '0.88rem', fontWeight: 600, color: '#333', flexWrap: 'wrap' }}>
              <span>ID: {data.patient?.patientId || appointmentId.slice(-6)}</span>
              {pCfg.showDoctorName && data.doctor?.name && <span>Dr: {data.doctor.name}</span>}
              {pCfg.showVisitNumber && <span>Visit #1</span>}
              {pCfg.showPrintTime && <span>Time: {moment().format('HH:mm')}</span>}
              {pCfg.showAbhaNumber && data.patient?.abhaNumber && <span>ABHA: {data.patient.abhaNumber}</span>}
            </div>
            <div style={{ borderBottom: '1px solid #dee2e6', margin: '10px 0 15px 0' }}></div>
          </div>
        );

      case 'vitals':
        return (
          <div className="mb-2 d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: '0.85rem' }}>
            {data.vitals.bpSystolic && <span><strong>BP</strong> {data.vitals.bpSystolic}/{data.vitals.bpDiastolic} mmHg <span className="mx-2 text-dark">|</span></span>}
            {data.vitals.pulse && <span><strong>Pulse</strong> {data.vitals.pulse} bpm <span className="mx-2 text-dark">|</span></span>}
            {data.vitals.weight && <span><strong>Weight</strong> {data.vitals.weight} kg <span className="mx-2 text-dark">|</span></span>}
            {data.vitals.spo2 && <span><strong>SPO2</strong> {data.vitals.spo2} %</span>}
          </div>
        );

      case 'complaints':
        return (
          <div className="mb-2">
            <div className="fw-bold text-decoration-underline mb-0" style={{ fontSize: '0.9rem' }}>Complaints:</div>
            <div style={{ fontSize: '0.85rem', paddingLeft: '8px', lineHeight: '1.2' }}>
              {data.complaints.map((c, i) => <div key={i}>&bull; {c.toUpperCase()}</div>)}
            </div>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="mb-2 mt-1">
            <span className="fw-bold text-decoration-underline text-uppercase" style={{ fontSize: '0.9rem' }}>
              Diagnosis: {data.diagnosis.join(', ')}
            </span>
          </div>
        );

      case 'rxSymbol':
        return <div className="mb-1 mt-1" style={{ fontSize: '1.5rem', lineHeight: '1' }}>&#8478;</div>;

      case 'medsHeader':
        return (
          <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '0.85rem', padding: '2px 0' }}>
            <div style={{ width: '45%' }}>Medicine</div>
            <div style={{ width: '20%', textAlign: 'center' }}>Dosage</div>
            <div style={{ width: '35%', textAlign: 'center' }}>Timing - Freq. - Duration</div>
          </div>
        );

      case 'medicine':
        const med = block.data;
        const hasSubDetails = med.genericName || med.when || med.notes;
        return (
          <div style={{ borderBottom: !block.isLast ? '1px solid #ccc' : 'none', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', padding: '4px 0 0 0' }}>
              <div style={{ width: '45%', fontWeight: 'bold', fontSize: '0.85rem' }}>{block.index + 1}) {med.type} {med.medicineName.toUpperCase()} *</div>
              <div style={{ width: '20%', textAlign: 'center', fontSize: '0.85rem' }}>{med.dosage ? med.dosage.split('-').join(' - ') : ''}</div>
              <div style={{ width: '35%', textAlign: 'center', fontSize: '0.85rem' }}>{med.when ? med.when + ' - ' : ''}{med.frequency ? med.frequency + ' - ' : ''}{med.duration || ''}</div>
            </div>
            {hasSubDetails && (
              <div style={{ paddingLeft: '22px' }}>
                {med.genericName && <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>Composition : {med.genericName}</div>}
                {med.when && <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>Timing &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 1 {med.when}</div>}
                {med.notes && <div style={{ fontSize: '0.75rem', lineHeight: '1.1' }}>Notes &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {med.notes.toUpperCase()}</div>}
              </div>
            )}
          </div>
        );

      case 'medsFooter':
        return <div style={{ borderTop: '1px solid #000', marginBottom: '10px' }}></div>;

      case 'advice':
        return (
          <div className="mb-2 mt-2" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            <span className="fw-bold">Advice:</span> <span className="text-uppercase">{data.advice}</span>
          </div>
        );

      case 'tests':
        return (
          <div className="mb-2" style={{ fontSize: '0.85rem' }}>
            <span className="fw-bold">Tests Prescribed:</span>{' '}
            <span className="text-uppercase">
              {data.testsRequested.map(t => {
                const name = typeof t === 'string' ? t : t.testName;
                const instr = typeof t === 'string' ? '' : t.instruction;
                return instr ? `${name} (${instr})` : name;
              }).filter(Boolean).join(' , ')}
            </span>
          </div>
        );

      case 'nextVisit':
        return (
          <div className="mb-2" style={{ fontSize: '0.85rem' }}>
            <span className="fw-bold">Next Visit:</span>{' '}
            <span className="text-uppercase">
              {data.nextVisit.date ? moment(data.nextVisit.date).format('DD-MMM-YYYY') : `${data.nextVisit.value} ${data.nextVisit.unit}`}
            </span>
          </div>
        );

      case 'referredTo':
        return (
          <div className="mb-2" style={{ fontSize: '0.85rem' }}>
            <span className="fw-bold">Referred To:</span>{' '}
            <span className="text-uppercase">
              {data.referredTo.filter(r => r.doctorName).map(r => {
                const name = `Dr. ${r.doctorName.replace(/^dr\.?\s*/i, '').trim()}`;
                return [name, r.speciality, r.phoneNo ? `Ph: +91 ${r.phoneNo}` : '', r.purpose ? `Purpose: ${r.purpose}` : ''].filter(Boolean).join(' - ');
              }).join(' , ')}
            </span>
          </div>
        );

      case 'signature':
        return (
          <div className="d-flex justify-content-end mt-4 pt-3 mb-2">
            <div className="text-center">
              {pCfg.printSignatureImage && doctorSignature ? (
                <img src={doctorSignature} alt="Signature" style={{ height: `${pCfg.signatureHeightCm * 0.4 * 37.8}px`, maxHeight: '80px', maxWidth: '160px', objectFit: 'contain', marginBottom: '2px', display: 'block' }} />
              ) : (
                <div style={{ height: '40px', width: '160px', borderBottom: '2px solid #333', marginBottom: '2px' }}></div>
              )}
              {pCfg.printSignatureText && <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{sigText}</div>}
              {doctorQuals && <div style={{ fontSize: '0.75rem', color: '#555' }}>{doctorQuals.split(',')[0]}</div>}
            </div>
          </div>
        );

      default: return null;
    }
  };

  const renderFooter = () => (
    footerImgSrc ? (
      <img src={footerImgSrc} alt="Footer" style={{ width: '100%', height: '80px', objectFit: 'contain', display: 'block', marginTop: 8 }} />
    ) : (
      <div className="text-center pt-2 pb-1">
        <div className="fw-bold p-1 mb-1 mx-auto" style={{ color: '#0056b3', border: '1px solid #0056b3', fontSize: '0.8rem', width: '90%' }}>
          DOCTOR CONSULTATION : DAY CARE : HOME CARE : ECG : HOLTER MONITOR : BLOOD TEST : VACCINATION : X-RAY : USG
        </div>
        <div style={{ fontSize: '0.75rem' }}>Powered by Klubnika Bytes (www.klubnikabytes.com)</div>
      </div>
    )
  );

  const handleEmail = async () => {
    let targetEmail = data?.patient?.email;
    if (!targetEmail) {
      targetEmail = window.prompt("Enter an email address to send the prescription:");
      if (!targetEmail) return;
    }
    setEmailing(true);
    try {
      await sendDocumentAsEmail('hp-print-area', targetEmail, `Prescription from ${clinicName}`, 'Please find attached your prescription.', 'Prescription.pdf');
      alert(`Email sent to ${targetEmail}`);
    } catch (err) { alert('Failed to send email.'); }
    finally { setEmailing(false); }
  };

  // ── 4. RENDER ROOT ────────────────────────────────────────────────────────
  
  if (loading) return <div className="p-5 text-center">Loading Prescription...</div>;
  if (!data) return <div className="p-5 text-center text-danger">Error: Could not load data.</div>;

  return (
    <div style={{ fontFamily: `"${printFont}", sans-serif`, color: '#000', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px 0' }}>
      
      {/* Print-specific CSS */}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .d-print-none { display: none !important; }
          .a4-page { box-shadow: none !important; margin: 0 !important; padding: 12mm 15mm !important; page-break-after: always; }
          .a4-page:last-child { page-break-after: auto; }
        }
      `}</style>

      {/* Buttons container (Hidden in print) */}
      <div className="d-print-none text-center mb-4 d-flex justify-content-center gap-3">
        <button className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={() => window.print()} disabled={emailing || pages === null}>
          <Printer size={18} /> {pages === null ? 'Paginating...' : 'Print Prescription'}
        </button>
        <button id="btn-email-prescription" className="btn btn-outline-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2" onClick={handleEmail} disabled={emailing || pages === null}>
          {emailing ? <Loader2 size={18} className="spin" /> : <Mail size={18} />} {emailing ? 'Sending...' : 'Email to Patient'}
        </button>
      </div>

      <div id="hp-print-area">
        {/* Pass 1: Hidden Measuring Container */}
        {pages === null && (
          <div id="measure-container" className="bg-white mx-auto" style={{ width: '210mm', padding: '12mm 15mm', visibility: 'hidden', position: 'absolute', top: '-9999px', left: 0 }}>
            {rawBlocks.map(block => (
              <div key={block.id} data-id={block.id}>{renderBlock(block, 0)}</div>
            ))}
          </div>
        )}

        {/* Pass 2: Render Paginated A4 Pages */}
        {pages !== null && pages.map((pageBlocks, pageIndex) => (
          <div key={pageIndex} className="a4-page bg-white shadow-sm mb-4 mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '12mm 15mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Render items for this page */}
            <div>
              {pageBlocks.map(block => (
                <div key={block.id}>{renderBlock(block, pageIndex)}</div>
              ))}
            </div>

            {/* Render footer ONLY on the last page, pushed to the bottom via margin-top: auto */}
            {pageIndex === pages.length - 1 && (
              <div style={{ marginTop: 'auto' }}>
                {renderFooter()}
              </div>
            )}
            
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default PrintPrescription;
