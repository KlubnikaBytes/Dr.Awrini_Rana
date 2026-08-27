import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import doctorService from '../../services/doctorService';
import frontdeskService from '../../services/frontdeskService';
import { Plus, X, Search, FileText, Activity, Droplet, List, Settings, FileBox, Stethoscope } from 'lucide-react';
import VaccineChart from '../../components/Doctor/VaccineChart';
import TestChart from '../../components/Doctor/TestChart';
import DocumentsView from '../../components/Doctor/DocumentsView';
import AutoCompleteTagInput from '../../components/Doctor/AutoCompleteTagInput';
import AutoCompleteTextArea from '../../components/Doctor/AutoCompleteTextArea';
import AutoCompleteSingleInput from '../../components/Doctor/AutoCompleteSingleInput';
import PastVisits from '../../components/Doctor/PastVisits';
import TemplateManagerModal from '../../components/Doctor/TemplateManagerModal';

/* ─── Section Action Icons ─────────────────────────────────────── */
const SectionActions = ({ onClear, onCopyPast, onSave, onLoad, showAll = true }) => (
  <div className="d-flex justify-content-center gap-1 mt-2">
    <button type="button" className="btn btn-sm btn-outline-danger py-0 px-1" title="Clear" onClick={(e) => { e.preventDefault(); onClear(); }}><i className="bi bi-trash" style={{ fontSize: '0.85rem' }} /></button>
    {showAll && <>
      <button type="button" className="btn btn-sm btn-outline-primary py-0 px-1" title="Load Prev" onClick={(e) => { e.preventDefault(); onCopyPast(); }}><i className="bi bi-arrow-counterclockwise" style={{ fontSize: '0.85rem' }} /></button>
      <button type="button" className="btn btn-sm btn-outline-success py-0 px-1" title="Save as Template" onClick={(e) => { e.preventDefault(); onSave(); }}><i className="bi bi-files" style={{ fontSize: '0.85rem' }} /></button>
      <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-1" title="Load Template" onClick={(e) => { e.preventDefault(); onLoad(); }}><i className="bi bi-file-earmark-plus" style={{ fontSize: '0.85rem' }} /></button>
    </>}
  </div>
);

const getEmptyMedicineRow = () => ({ type: 'TAB.', medicineName: '', genericName: '', dosage: '', when: 'After Meal', frequency: 'daily', duration: '5 days', notes: '', instructions: '' });

const ensureEmptyMedicineRow = (meds) => {
    const validMeds = meds || [];
    if (validMeds.length === 0) return [getEmptyMedicineRow()];
    const last = validMeds[validMeds.length - 1];
    if (last.medicineName && last.medicineName.trim() !== '') {
        return [...validMeds, getEmptyMedicineRow()];
    }
    return validMeds;
};

const VisitPad = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    vitals: { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' },
    complaints: [],
    pastHistory: '',
    physicalExamination: '',
    diagnosis: [],
    medicines: [getEmptyMedicineRow()],
    advice: '',
    testsRequested: [{ testName: '', instruction: '' }],
    nextVisit: { value: '', unit: 'Days', date: '' },
    referredTo: [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }],
    historyDetails: { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
    pastMedications: [],
    physicalExaminationDetails: { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
  });
  const [patientInfo, setPatientInfo] = useState({});
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);
  const [showPhysicalExamDetails, setShowPhysicalExamDetails] = useState(false);
  const [pastConsultations, setPastConsultations] = useState([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState('Consultation');
  const [showPastView, setShowPastView] = useState(false);
  const [templateModal, setTemplateModal] = useState({ isOpen: false, mode: 'SAVE', storageKey: '', title: '', dataToSave: null, onLoad: null });
  const [referralDoctorsData, setReferralDoctorsData] = useState([]);

  useEffect(() => {
    fetchConsultation();
    fetchReferralDoctors();
  }, [appointmentId]);

  const fetchReferralDoctors = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/referral-doctors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReferralDoctorsData(response.data || []);
    } catch (e) {
      console.error('Error fetching referral doctors', e);
    }
  };

  useEffect(() => {
    if (patientInfo._id) {
      fetchPastConsultations();
    }
  }, [patientInfo._id]);

  const fetchPastConsultations = async () => {
    try {
      const data = await doctorService.getPastConsultations(patientInfo._id);
      // Exclude the current consultation from the past visits list
      setPastConsultations(data.filter(c => c.appointment?._id !== appointmentId));
    } catch (error) {
      console.error('Error fetching past consultations:', error);
    }
  };

  const fetchConsultation = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getConsultation(appointmentId);
      if (data) {
        setFormData({
          vitals: data.vitals || {},
          complaints: data.complaints || [],
          pastHistory: data.pastHistory || '',
          physicalExamination: data.physicalExamination || '',
          diagnosis: data.diagnosis || [],
          medicines: ensureEmptyMedicineRow(data.medicines),
          advice: data.advice || '',
          testsRequested: (Array.isArray(data.testsRequested) && data.testsRequested.length > 0) ? data.testsRequested.map(t => typeof t === 'string' ? { testName: t, instruction: '' } : t) : [{ testName: '', instruction: '' }],
          nextVisit: data.nextVisit || { value: '', unit: 'Days', date: '' },
          referredTo: (Array.isArray(data.referredTo) && data.referredTo.length > 0) ? data.referredTo : (data.referredTo && data.referredTo.doctorName ? [{ doctorName: data.referredTo.doctorName, speciality: data.referredTo.speciality, phoneNo: data.referredTo.phoneNo, purpose: data.referredTo.email || data.referredTo.purpose || '' }] : [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }]),
          historyDetails: data.historyDetails || { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
          pastMedications: data.pastMedications || [],
          physicalExaminationDetails: data.physicalExaminationDetails || { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }      });
        setPatientInfo(data.patient || {});
      }
    } catch (error) {
      console.error('Error fetching consultation', error);
    }
    setLoading(false);
  };

  const handleSave = async (endConsultation = false) => {
    try {
      const payload = {
        ...formData,
        medicines: formData.medicines.filter(m => m.medicineName && m.medicineName.trim() !== '')
      };
      await doctorService.saveConsultation(appointmentId, payload);
      if (endConsultation) {
        await frontdeskService.updateAppointmentStatus(appointmentId, 'REVIEWED');
        navigate('/doctor');
      } else {
        alert('Consultation saved successfully');
      }
    } catch (error) {
      console.error('Error saving consultation', error);
      alert('Failed to save consultation');
    }
  };

  const handleVitalChange = (field, value) => {
    setFormData(prev => {
      const updatedVitals = { ...prev.vitals, [field]: value };
      // Auto-calculate BMI when height or weight changes
      const h = parseFloat(field === 'height' ? value : updatedVitals.height);
      const w = parseFloat(field === 'weight' ? value : updatedVitals.weight);
      if (h > 0 && w > 0) {
        const heightInM = h / 100;
        updatedVitals.bmi = (w / (heightInM * heightInM)).toFixed(1);
      } else if (field === 'height' || field === 'weight') {
        updatedVitals.bmi = '';
      }
      return { ...prev, vitals: updatedVitals };
    });
  };



  const generateTimingText = (dosage, when) => {
    if (!dosage) return '';
    const parts = dosage.split('-');
    
    let prefix = '';
    if (when) {
       if (when.toLowerCase().includes('before') || when.toLowerCase().includes('empty stomach')) prefix = 'Before';
       else if (when.toLowerCase().includes('after')) prefix = 'After';
    }

    const labels = ['breakfast', 'lunch', 'dinner', 'bedtime'];
    let timings = [];
    
    for (let i = 0; i < parts.length; i++) {
       const val = parseFloat(parts[i]);
       if (!isNaN(val) && val > 0 && i < labels.length) {
          const timingStr = prefix ? `${val} ${prefix} ${labels[i]}` : `${val} ${labels[i]}`;
          timings.push(timingStr);
       }
    }
    
    return timings.join(', ');
  };

  const addMedicine = () => {
    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, getEmptyMedicineRow()]
    }));
  };

  const updateMedicine = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.medicines];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'dosage' || field === 'when') {
        updated[index].instructions = generateTimingText(updated[index].dosage, updated[index].when);
      }
      
      // Auto-append new empty row if they start typing in the last row
      if (index === updated.length - 1 && field === 'medicineName' && value && value.trim() !== '') {
         updated.push(getEmptyMedicineRow());
      }
      
      return { ...prev, medicines: updated };
    });
  };

  const handleMedicineSelect = async (index, name) => {
    if (!name) return;
    try {
      const details = await doctorService.getMedicineDetails(name);
      if (details) {
        setFormData(prev => {
          const updated = [...prev.medicines];
          const current = updated[index];
          // Auto-fill empty fields based on previous usage
          if (!current.genericName && details.genericName) current.genericName = details.genericName;
          if (details.type && current.type === 'TAB.') current.type = details.type; // simple heuristic
          if (details.dosage && current.dosage === '1-0-1') current.dosage = details.dosage;
          if (details.when && current.when === 'After Meal') current.when = details.when;
          if (details.frequency && current.frequency === 'daily') current.frequency = details.frequency;
          if (details.duration && current.duration === '5 days') current.duration = details.duration;
          
          return { ...prev, medicines: updated };
        });
      }
    } catch (err) {
      console.error('Error auto-filling medicine details', err);
    }
  };

  const handleClearAllMedicines = () => {
    if (window.confirm('Are you sure you want to clear all medicines?')) {
      setFormData(prev => ({ ...prev, medicines: [getEmptyMedicineRow()] }));
    }
  };

  const handleLoadPrevMedicines = () => {
    if (pastConsultations && pastConsultations.length > 0) {
      const prevMedicines = pastConsultations[0].medicines || [];
      if (prevMedicines.length > 0) {
        if (window.confirm('Load medicines from the most recent visit?')) {
           setFormData(prev => ({ ...prev, medicines: ensureEmptyMedicineRow(prevMedicines.map(m => {
             const { _id, ...rest } = m;
             return rest;
           })) }));
        }
      } else {
        alert('No medicines found in the previous visit.');
      }
    } else {
      alert('No previous visits found for this patient.');
    }
  };

  const handleSaveAsTemplate = () => {
    if (formData.medicines.length === 0 || (formData.medicines.length === 1 && formData.medicines[0].medicineName === '')) {
      alert('No medicines to save as template.');
      return;
    }
    setTemplateModal({
      isOpen: true,
      mode: 'SAVE',
      storageKey: 'medicineTemplates',
      title: 'Medicines',
      dataToSave: formData.medicines.filter(m => m.medicineName.trim() !== ''),
      onLoad: null
    });
  };

  const handleLoadTemplate = () => {
    setTemplateModal({
      isOpen: true,
      mode: 'LOAD',
      storageKey: 'medicineTemplates',
      title: 'Medicines',
      dataToSave: null,
      onLoad: (data) => setFormData(prev => ({ ...prev, medicines: ensureEmptyMedicineRow([...prev.medicines.filter(m => m.medicineName.trim() !== ''), ...data]) }))
    });
  };

  const handleClearAllForm = () => {
    if (window.confirm('Are you sure you want to clear the entire consultation form?')) {
      setFormData({
        vitals: { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' },
        complaints: [],
        pastHistory: '',
        physicalExamination: '',
        diagnosis: [],
        medicines: [getEmptyMedicineRow()],
        advice: '',
        testsRequested: [],
        nextVisit: { value: '', unit: 'Days', date: '' },
        referredTo: [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }],
        historyDetails: { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
        pastMedications: [],
        physicalExaminationDetails: { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
      });
    }
  };

  const handleLoadPrevForm = () => {
    if (pastConsultations && pastConsultations.length > 0) {
      if (window.confirm('Load data from the most recent visit?')) {
         const prev = JSON.parse(JSON.stringify(pastConsultations[0]));
         setFormData({
            ...formData,
            vitals: prev.vitals || formData.vitals,
            complaints: prev.complaints || formData.complaints,
            pastHistory: prev.pastHistory || formData.pastHistory,
            physicalExamination: prev.physicalExamination || formData.physicalExamination,
            diagnosis: prev.diagnosis || formData.diagnosis,
            medicines: ensureEmptyMedicineRow(prev.medicines || formData.medicines),
            advice: prev.advice || formData.advice,
            testsRequested: prev.testsRequested || formData.testsRequested,
            historyDetails: prev.historyDetails || formData.historyDetails,
            pastMedications: prev.pastMedications || formData.pastMedications,
            physicalExaminationDetails: prev.physicalExaminationDetails || formData.physicalExaminationDetails
         });
      }
    } else {
      alert('No past visit data found.');
    }
  };

  const handleSaveFormAsTemplate = () => {
    setTemplateModal({
      isOpen: true,
      mode: 'SAVE',
      storageKey: 'formTemplates',
      title: 'Consultation Form',
      dataToSave: formData,
      onLoad: null
    });
  };

  const handleLoadFormTemplate = () => {
    setTemplateModal({
      isOpen: true,
      mode: 'LOAD',
      storageKey: 'formTemplates',
      title: 'Consultation Form',
      dataToSave: null,
      onLoad: (data) => setFormData(data)
    });
  };

  // ── Generic Per-Section Action Handlers ────────────────────────
  const clearSection = (key, def) => {
    if (window.confirm('Clear this section?'))
      setFormData(p => ({ ...p, [key]: def }));
  };

  const copyPrevSection = (key) => {
    if (!pastConsultations?.length) return alert('No past visit data found.');
    const val = pastConsultations[0][key];
    const isObjectEmpty = (obj) => {
      if (!obj) return true;
      if (Array.isArray(obj)) return obj.length === 0;
      if (typeof obj === 'object') return Object.values(obj).every(v => isObjectEmpty(v));
      return obj === '';
    };
    if (isObjectEmpty(val)) return alert('No past visit data found for this section.');
    if (window.confirm('Load from previous visit?'))
      setFormData(p => ({ ...p, [key]: val }));
  };

  const saveSectionTemplate = (key) => {
    const val = formData[key];
    const isObjectEmpty = (obj) => {
      if (!obj) return true;
      if (Array.isArray(obj)) return obj.length === 0;
      if (typeof obj === 'object') return Object.values(obj).every(v => isObjectEmpty(v));
      return obj === '';
    };
    if (isObjectEmpty(val)) return alert('Nothing to save as template.');
    setTemplateModal({
      isOpen: true,
      mode: 'SAVE',
      storageKey: `sectionTpl_${key}`,
      title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      dataToSave: val,
      onLoad: null
    });
  };

  const loadSectionTemplate = (key) => {
    setTemplateModal({
      isOpen: true,
      mode: 'LOAD',
      storageKey: `sectionTpl_${key}`,
      title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      dataToSave: null,
      onLoad: (data) => setFormData(p => {
        const currentData = p[key];
        let mergedData;
        
        if (Array.isArray(currentData)) {
          mergedData = [...currentData];
          if (Array.isArray(data)) {
            mergedData = [...mergedData, ...data];
          } else if (data) {
            mergedData.push(data);
          }
        } else if (typeof currentData === 'string') {
          if (currentData.trim() === '') {
            mergedData = data;
          } else {
            mergedData = currentData + '\n' + data;
          }
        } else if (typeof currentData === 'object' && currentData !== null) {
          mergedData = { ...currentData, ...data };
        } else {
          mergedData = data;
        }

        return { ...p, [key]: mergedData };
      })
    });
  };

  if (loading) return <div className="p-5 text-center">Loading consultation...</div>;

  const patientNameFormatted = `${patientInfo.name || 'Unknown'} (${patientInfo.age || '--'}Y, ${patientInfo.gender || '-'})`;

  const handleNadToggle = (e) => {
    const isChecked = e.target.checked;
    setFormData(prev => {
      let updatedDetails = { ...prev.physicalExaminationDetails, isNad: isChecked };
      if (isChecked) {
        updatedDetails.breast = 'NAD';
        updatedDetails.perSpeculum = 'NAD';
        updatedDetails.perAbdominal = 'NAD';
        updatedDetails.perVaginal = 'NAD';
      } else {
        if (updatedDetails.breast === 'NAD') updatedDetails.breast = '';
        if (updatedDetails.perSpeculum === 'NAD') updatedDetails.perSpeculum = '';
        if (updatedDetails.perAbdominal === 'NAD') updatedDetails.perAbdominal = '';
        if (updatedDetails.perVaginal === 'NAD') updatedDetails.perVaginal = '';
      }
      return { ...prev, physicalExaminationDetails: updatedDetails };
    });
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#f8f9fa' }}>
      {/* Top Patient Header */}
      <div className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm">
         <div>
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0 fw-bold text-dark">{patientNameFormatted}</h5>
              <button className="btn btn-outline-secondary btn-sm py-0 rounded-pill d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <Plus size={12}/> tag
              </button>
              <button className="btn btn-outline-primary btn-sm py-0 rounded-pill d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-telephone"></i> Call
              </button>
            </div>
            <div className="text-secondary small">{patientInfo.patientId || appointmentId.slice(-6)}</div>
         </div>
      </div>

      <div className="d-flex flex-grow-1">
        {/* Left Icon Sidebar */}
        <div className="bg-white border-end d-flex flex-column align-items-center py-3 gap-4" style={{ width: '60px', zIndex: 10 }}>
           <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Consultation')}>
              <Stethoscope size={20} className={`mb-1 ${activeSidebarTab === 'Consultation' ? 'text-primary' : 'text-secondary'}`} />
              <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Consultation' ? 'text-primary' : 'text-secondary'}>Consult</div>
           </div>
           
           <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Documents')}>
              <FileText size={20} className={`mb-1 ${activeSidebarTab === 'Documents' ? 'text-primary' : 'text-secondary'}`} />
              <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Documents' ? 'text-primary' : 'text-secondary'}>Documents</div>
           </div>

           <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Vaccine')}>
              <Droplet size={20} className={`mb-1 ${activeSidebarTab === 'Vaccine' ? 'text-primary' : 'text-secondary'}`} />
              <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Vaccine' ? 'text-primary' : 'text-secondary'}>Vaccine</div>
           </div>
           <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Tests')}>
              <List size={20} className={`mb-1 ${activeSidebarTab === 'Tests' ? 'text-primary' : 'text-secondary'}`} />
              <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Tests' ? 'text-primary' : 'text-secondary'}>Tests</div>
           </div>

        </div>

        {/* Main Content Form */}
        <div className="flex-grow-1 position-relative bg-white h-100 overflow-hidden d-flex flex-column">
           {activeSidebarTab === 'Vaccine' ? (
             <VaccineChart patientId={patientInfo._id} onBack={() => setActiveSidebarTab('Consultation')} />
           ) : activeSidebarTab === 'Tests' ? (
             <TestChart 
               patientId={patientInfo._id} 
               appointmentId={appointmentId} 
               patientInfo={patientInfo} 
               onBack={() => setActiveSidebarTab('Consultation')} 
             />
           ) : activeSidebarTab === 'Documents' ? (
             <DocumentsView patientId={patientInfo._id} />
           ) : (
             <div className="h-100 overflow-auto">
               {/* Form Toolbar */}
               <div className="d-flex justify-content-between align-items-center p-3 border-bottom sticky-top bg-white" style={{ zIndex: 5 }}>
                  <div className="d-flex gap-4">
                     <div className={`fw-bold cursor-pointer pb-1 ${!showPastView ? 'text-primary border-bottom border-primary border-2' : 'text-secondary'}`} onClick={() => setShowPastView(false)}>
                      {pastConsultations.length + 1}{['st', 'nd', 'rd'][(((pastConsultations.length + 1) % 100) > 10 && ((pastConsultations.length + 1) % 100) < 20) ? 3 : ((pastConsultations.length + 1) % 10) - 1] || 'th'} Visit
                    </div>
                    <div className={`fw-semibold cursor-pointer pb-1 ${showPastView ? 'text-primary border-bottom border-primary border-2' : 'text-secondary'}`} onClick={() => setShowPastView(true)}>View Past</div>
                  </div>
                  {!showPastView && <div className="d-flex gap-3 text-secondary small">
                     <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadPrevForm}><i className="bi bi-arrow-counterclockwise"></i> Load Prev Visit</span>
                     <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadFormTemplate}><i className="bi bi-file-earmark-arrow-down"></i> Load template</span>
                     <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleSaveFormAsTemplate}><i className="bi bi-file-earmark-plus"></i> Save as template</span>
                     <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleClearAllForm}><i className="bi bi-trash"></i> Clear All</span>
                  </div>}
               </div>

           {showPastView ? (
             <div className="p-4">
               {pastConsultations.length === 0
                 ? <div className="text-center text-muted py-5 fs-6"><i className="bi bi-clock-history me-2"></i>No past visit data found.</div>
                 : <PastVisits consultations={pastConsultations} />}
             </div>
           ) : (
           <div className="p-4" style={{ maxWidth: '1000px' }}>
              
              {/* Vitals */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Vitals <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('vitals', { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' })}
                      onCopyPast={() => copyPrevSection('vitals')}
                      onSave={() => saveSectionTemplate('vitals')}
                      onLoad={() => loadSectionTemplate('vitals')}
                   />
                 </div>
                 <div className="flex-grow-1">
                    <div className="row g-3 mb-2">
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">BP</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '50px' }} value={formData.vitals.bpSystolic} onChange={e => handleVitalChange('bpSystolic', e.target.value)} />
                             <span className="text-secondary">/</span>
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '50px' }} value={formData.vitals.bpDiastolic} onChange={e => handleVitalChange('bpDiastolic', e.target.value)} />
                             <span className="small text-secondary ms-1">mmHg</span>
                          </div>
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">Pulse</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.pulse} onChange={e => handleVitalChange('pulse', e.target.value)} />
                             <span className="small text-secondary ms-1">bpm</span>
                          </div>
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">Height</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.height} onChange={e => handleVitalChange('height', e.target.value)} />
                             <span className="small text-secondary ms-1">cm</span>
                          </div>
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">Weight</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.weight} onChange={e => handleVitalChange('weight', e.target.value)} />
                             <span className="small text-secondary ms-1">kg</span>
                          </div>
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">Temperature</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.temperature} onChange={e => handleVitalChange('temperature', e.target.value)} />
                             <span className="small text-secondary ms-1">F</span>
                          </div>
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">BMI</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.bmi} onChange={e => handleVitalChange('bmi', e.target.value)} />
                             <span className="small text-secondary ms-1">Kg/m2</span>
                          </div>
                       </div>
                    </div>
                    <div className="row g-3">
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">Waist/Hip</label>
                          <input type="text" className="form-control form-control-sm text-center" style={{ width: '80px' }} value={formData.vitals.waistHip} onChange={e => handleVitalChange('waistHip', e.target.value)} />
                       </div>
                       <div className="col-auto">
                          <label className="small text-secondary mb-1">SPO2</label>
                          <div className="d-flex align-items-center gap-1">
                             <input type="text" className="form-control form-control-sm text-center" style={{ width: '60px' }} value={formData.vitals.spo2} onChange={e => handleVitalChange('spo2', e.target.value)} />
                             <span className="small text-secondary ms-1">%</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

               <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Complaints <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('complaints', [])}
                      onCopyPast={() => copyPrevSection('complaints')}
                      onSave={() => saveSectionTemplate('complaints')}
                      onLoad={() => loadSectionTemplate('complaints')}
                   />
                 </div>
                 <AutoCompleteTagInput 
                    tags={formData.complaints} 
                    setTags={(newTags) => setFormData({...formData, complaints: newTags})} 
                    type="COMPLAINT" 
                    placeholder="Complaints..." 
                 />
              </div>

              {/* Past History */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Past History <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('pastHistory', '')}
                      onCopyPast={() => copyPrevSection('pastHistory')}
                      onSave={() => saveSectionTemplate('pastHistory')}
                      onLoad={() => loadSectionTemplate('pastHistory')}
                   />
                 </div>
                 <AutoCompleteTextArea 
                    value={formData.pastHistory}
                    onChange={(val) => setFormData({...formData, pastHistory: val})}
                    type="PAST_HISTORY"
                    placeholder="Past History..."
                 />
              </div>

              {/* Physical Examination */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Physical Exam <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('physicalExamination', '')}
                      onCopyPast={() => copyPrevSection('physicalExamination')}
                      onSave={() => saveSectionTemplate('physicalExamination')}
                      onLoad={() => loadSectionTemplate('physicalExamination')}
                   />
                 </div>
                 <AutoCompleteTextArea 
                    value={formData.physicalExamination}
                    onChange={(val) => setFormData({...formData, physicalExamination: val})}
                    type="PHYSICAL_EXAM"
                    placeholder="Physical Examination..."
                 />
              </div>

               {/* Diagnosis */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Diagnosis <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('diagnosis', [])}
                      onCopyPast={() => copyPrevSection('diagnosis')}
                      onSave={() => saveSectionTemplate('diagnosis')}
                      onLoad={() => loadSectionTemplate('diagnosis')}
                   />
                 </div>
                 <AutoCompleteTagInput 
                    tags={formData.diagnosis} 
                    setTags={(newTags) => setFormData({...formData, diagnosis: newTags})} 
                    type="DIAGNOSIS" 
                    placeholder="Diagnosis..." 
                 />
              </div>

              {/* Medicines Table */}
              <div className="mb-4">
                 <table className="table table-bordered table-sm align-middle" style={{ fontSize: '0.85rem' }}>
                    <thead className="text-secondary" style={{ backgroundColor: '#f4f6fa' }}>
                       <tr>
                          <th className="fw-semibold text-center border-0" style={{ width: '40px' }}>#</th>
                          <th className="fw-semibold border-0" style={{ width: '90px' }}>Type <i className="bi bi-chevron-down small"></i></th>
                          <th className="fw-semibold border-0">Medicine</th>
                          <th className="fw-semibold border-0" style={{ width: '100px' }}>Dosage <i className="bi bi-chevron-down small"></i></th>
                          <th className="fw-semibold border-0" style={{ width: '130px' }}>When <i className="bi bi-chevron-down small"></i></th>
                          <th className="fw-semibold border-0" style={{ width: '120px' }}>Frequency <i className="bi bi-chevron-down small"></i></th>
                          <th className="fw-semibold border-0" style={{ width: '110px' }}>Duration <i className="bi bi-chevron-down small"></i></th>
                          <th className="fw-semibold border-0">Notes</th>
                       </tr>
                    </thead>
                    <tbody>
                       {formData.medicines.map((med, idx) => (
                          <tr key={idx}>
                             <td className="text-center">{idx + 1}</td>
                             <td>
                                <select className="form-select form-select-sm border-0 shadow-none bg-transparent" value={med.type} onChange={e => updateMedicine(idx, 'type', e.target.value)}>
                                   {['TAB.', 'SYP.', 'CRM.', 'POW.', 'INJ.', 'CAP.', 'DRP.', 'SUS.', 'LIQ.', 'SAC.', 'EXP.', 'OIN.', 'GEN.', 'LOT.', 'GEL.', 'GRA.', 'SOAP.', 'SOL.', 'VAC.', 'PAS.', 'INH.', 'OTH.', 'SPR.'].map(opt => (
                                       <option key={opt} value={opt}>{opt}</option>
                                   ))}
                                </select>
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.medicineName} 
                                   onChange={val => updateMedicine(idx, 'medicineName', val)} 
                                   onSelect={val => handleMedicineSelect(idx, val)}
                                   type="MEDICINE" 
                                   placeholder="Medicine Name" 
                                   className="form-control form-control-sm border-0 shadow-none fw-semibold text-primary"
                                />
                                <div className="d-flex align-items-center text-secondary ms-2" style={{ marginTop: '-4px' }}>
                                    <i className="bi bi-pencil text-secondary opacity-50 me-1" style={{ fontSize: '0.7rem' }}></i>
                                    <AutoCompleteSingleInput 
                                       value={med.genericName || ''} 
                                       onChange={val => updateMedicine(idx, 'genericName', val)} 
                                       type="GENERIC_NAME" 
                                       placeholder="Generic name" 
                                       className="form-control form-control-sm border-0 shadow-none p-0 text-secondary"
                                       style={{ fontSize: '0.75rem', backgroundColor: 'transparent' }}
                                    />
                                </div>
                                <div className="d-flex align-items-center text-success ms-2 mt-1">
                                    <i className="bi bi-clock-history opacity-75 me-1" style={{ fontSize: '0.75rem' }}></i>
                                    <input 
                                       type="text"
                                       value={med.instructions || ''} 
                                       onChange={e => updateMedicine(idx, 'instructions', e.target.value)} 
                                       placeholder="Detailed timing..." 
                                       className="form-control form-control-sm border-0 shadow-none p-0 text-success fw-medium"
                                       style={{ fontSize: '0.75rem', backgroundColor: 'transparent' }}
                                    />
                                </div>
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.dosage} 
                                   onChange={val => updateMedicine(idx, 'dosage', val)}
                                   onKeyDown={e => {
                                      if (e.key === 'Enter' && /^\d{2,}$/.test(med.dosage)) {
                                         e.preventDefault();
                                         updateMedicine(idx, 'dosage', med.dosage.split('').join('-'));
                                      }
                                   }}
                                   onSelect={val => {
                                      if (/^\d{2,}$/.test(val)) {
                                         updateMedicine(idx, 'dosage', val.split('').join('-'));
                                      }
                                   }}
                                   type="DOSAGE" 
                                   placeholder="Dosage" 
                                   className="form-control form-control-sm border-0 shadow-none text-center"
                                   defaultOptions={[]}
                                />
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.when} 
                                   onChange={val => updateMedicine(idx, 'when', val)} 
                                   type="WHEN" 
                                   placeholder="After Meal" 
                                   className="form-control form-control-sm border-0 shadow-none text-center"
                                   defaultOptions={['After Meal', 'Before Meal', 'Empty Stomach', 'Bed Time', 'SOS', 'Before Food', 'After Food', 'Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner']}
                                />
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.frequency} 
                                   onChange={val => updateMedicine(idx, 'frequency', val)} 
                                   type="FREQUENCY" 
                                   placeholder="daily" 
                                   className="form-control form-control-sm border-0 shadow-none text-center"
                                   defaultOptions={['daily', 'alternative day', 'weekly', 'fort night', 'monthly', 'stat', 'sos', 'weekly twice', 'weekly thrice']}
                                />
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.duration} 
                                   onChange={val => updateMedicine(idx, 'duration', val)} 
                                   type="DURATION" 
                                   placeholder="5 days" 
                                   className="form-control form-control-sm border-0 shadow-none text-center"
                                   defaultOptions={['3 days', '5 days', '1 week', '2 weeks', '1 month', '2 months', '3 months']}
                                />
                             </td>
                             <td>
                                <AutoCompleteSingleInput 
                                   value={med.notes} 
                                   onChange={val => updateMedicine(idx, 'notes', val)} 
                                   type="NOTES" 
                                   placeholder="Add notes" 
                                   className="form-control form-control-sm border-0 shadow-none text-center"
                                   defaultOptions={[]}
                                />
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                  <div className="d-flex justify-content-between mt-2">
                     <button className="btn btn-link text-decoration-none text-secondary p-0" style={{ fontSize: '0.85rem' }} onClick={addMedicine}>Add Medicine</button>
                     <div className="d-flex gap-3 text-secondary" style={{ fontSize: '0.85rem' }}>
                        <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadPrevMedicines}><i className="bi bi-arrow-counterclockwise"></i> Load Prev</span>
                        <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadTemplate}><i className="bi bi-file-earmark-arrow-down"></i> Load template</span>
                        <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleSaveAsTemplate}><i className="bi bi-file-earmark-plus"></i> Save as template</span>
                        <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleClearAllMedicines}><i className="bi bi-trash"></i> Clear All</span>
                     </div>
                  </div>
              </div>

              {/* Advice */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Advice <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      onClear={() => clearSection('advice', '')}
                      onCopyPast={() => copyPrevSection('advice')}
                      onSave={() => saveSectionTemplate('advice')}
                      onLoad={() => loadSectionTemplate('advice')}
                   />
                 </div>
                 <AutoCompleteTextArea 
                    value={formData.advice}
                    onChange={(val) => setFormData({...formData, advice: val})}
                    type="ADVICE"
                    placeholder="..."
                 />
              </div>

              {/* Tests Requested */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Tests Requested <i className="bi bi-pencil ms-1"></i>
                 </div>
                 <div className="flex-grow-1">
                    <table className="table table-borderless table-sm mb-0">
                       <thead>
                          <tr>
                             <th className="small text-secondary fw-semibold ps-0" style={{ width: '45%' }}>Test Name</th>
                             <th className="small text-secondary fw-semibold" style={{ width: '45%' }}>Instructions / Notes</th>
                             <th></th>
                          </tr>
                       </thead>
                       <tbody>
                          {formData.testsRequested.map((test, index) => (
                             <tr key={index} className="align-middle">
                                <td className="ps-0">
                                   <AutoCompleteSingleInput 
                                      className="form-control form-control-sm text-primary shadow-none" 
                                      style={{ border: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}
                                      placeholder="e.g. CBC, X-Ray" 
                                      value={test.testName} 
                                      onChange={val => {
                                        const newArr = [...formData.testsRequested];
                                        newArr[index].testName = val;
                                        setFormData({...formData, testsRequested: newArr});
                                      }}
                                      type="TEST"
                                   />
                                </td>
                                <td>
                                   <input type="text" className="form-control form-control-sm shadow-none" 
                                      style={{ border: '1px solid #dee2e6' }}
                                      placeholder="e.g. Fasting" 
                                      value={test.instruction} 
                                      onChange={e => {
                                         const newArr = [...formData.testsRequested];
                                         newArr[index].instruction = e.target.value;
                                         setFormData({...formData, testsRequested: newArr});
                                      }} />
                                </td>
                                <td className="text-end pe-0">
                                   {formData.testsRequested.length > 1 && (
                                      <button className="btn btn-sm text-danger p-1 border-0 bg-transparent" onClick={() => setFormData(prev => ({...prev, testsRequested: prev.testsRequested.filter((_, i) => i !== index)}))}>
                                         <i className="bi bi-trash"></i>
                                      </button>
                                   )}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    <button className="btn btn-link text-decoration-none p-0 mt-1 text-primary" style={{ fontSize: '0.85rem' }} onClick={() => setFormData(prev => ({...prev, testsRequested: [...prev.testsRequested, { testName: '', instruction: '' }]}))}>
                       + Add Test
                    </button>
                 </div>
              </div>

              {/* Next Visit */}
              <div className="d-flex mb-5 pb-4 border-bottom">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                   Next Visit <i className="bi bi-pencil ms-1"></i>
                   <SectionActions
                      showAll={false}
                      onClear={() => clearSection('nextVisit', { value: '', unit: 'Days', date: '' })}
                      onCopyPast={() => {}}
                      onSave={() => {}}
                      onLoad={() => {}}
                   />
                 </div>
                 <div className="d-flex gap-3 align-items-center">
                    <input type="text" className="form-control text-center" style={{ width: '80px', border: '1px solid #dee2e6' }} value={formData.nextVisit.value} onChange={e => setFormData({...formData, nextVisit: {...formData.nextVisit, value: e.target.value}})} placeholder="2" />
                    <div className="btn-group">
                       <button className={`btn ${formData.nextVisit.unit === 'Days' ? 'btn-secondary' : 'btn-outline-secondary'}`} style={{ borderColor: '#dee2e6' }} onClick={() => setFormData({...formData, nextVisit: {...formData.nextVisit, unit: 'Days'}})}>Days</button>
                       <button className={`btn ${formData.nextVisit.unit === 'Weeks' ? 'btn-secondary' : 'btn-outline-secondary'}`} style={{ borderColor: '#dee2e6', borderLeft: 0, borderRight: 0 }} onClick={() => setFormData({...formData, nextVisit: {...formData.nextVisit, unit: 'Weeks'}})}>Weeks</button>
                       <button className={`btn ${formData.nextVisit.unit === 'Months' ? 'btn-secondary' : 'btn-outline-secondary'}`} style={{ borderColor: '#dee2e6' }} onClick={() => setFormData({...formData, nextVisit: {...formData.nextVisit, unit: 'Months'}})}>Months</button>
                    </div>
                    <span className="text-secondary mx-2">Or</span>
                    <input type="date" className="form-control" style={{ width: '170px', border: '1px solid #dee2e6', color: formData.nextVisit.date ? '#212529' : '#6c757d' }} value={formData.nextVisit.date} onChange={e => setFormData({...formData, nextVisit: {...formData.nextVisit, date: e.target.value}})} />
                 </div>
              </div>

              {/* Referred to */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                   <div className="mb-2">Referred to</div>
                   <SectionActions
                      showAll={false}
                      onClear={() => clearSection('referredTo', [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }])}
                      onCopyPast={() => {}}
                      onSave={() => {}}
                      onLoad={() => {}}
                   />
                   <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" style={{ width: '28px', height: '28px', padding: 0 }} onClick={() => setFormData(prev => ({...prev, referredTo: [...prev.referredTo, { doctorName: '', speciality: '', phoneNo: '', purpose: '' }]}))}>
                      <i className="bi bi-plus"></i>
                   </button>
                 </div>
                 <div className="flex-grow-1">
                    {formData.referredTo.map((referral, index) => (
                       <div key={index} className="row g-3 align-items-end mb-3 pb-3 border-bottom position-relative">
                          {formData.referredTo.length > 1 && (
                             <div className="position-absolute" style={{ top: 0, right: 0, width: 'auto' }}>
                                <i className="bi bi-x-circle text-danger cursor-pointer" onClick={() => setFormData(prev => ({...prev, referredTo: prev.referredTo.filter((_, i) => i !== index)}))}></i>
                             </div>
                          )}
                          <div className="col-auto">
                             <label className="form-label small text-secondary mb-1">Doctor Name</label>
                             <div className="d-flex gap-2">
                                <div className="d-flex align-items-center bg-white shadow-sm rounded border" style={{ width: '250px' }}>
                                   <span className="text-primary px-3 bg-transparent">Dr.</span>
                                   <input 
                                      className="form-control border-0 ps-0 text-primary shadow-none bg-transparent" 
                                      style={{ outline: 'none', boxShadow: 'none' }}
                                      placeholder="Doctor Name" 
                                      value={referral.doctorName} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        const newArr = [...formData.referredTo];
                                        newArr[index].doctorName = val;
                                        const match = referralDoctorsData.find(d => d.name.toLowerCase() === val.toLowerCase());
                                        if (match) {
                                            newArr[index].speciality = match.specialization || '';
                                        }
                                        setFormData({...formData, referredTo: newArr});
                                      }}
                                      list={`referral-doctors-list-${index}`}
                                   />
                                   <datalist id={`referral-doctors-list-${index}`}>
                                      {referralDoctorsData.map(doc => (
                                         <option key={doc._id} value={doc.name} />
                                      ))}
                                   </datalist>
                                </div>
                                <select className="form-select text-secondary" style={{ width: '150px', borderColor: '#dee2e6' }} value={referral.speciality} onChange={e => {
                                   const newArr = [...formData.referredTo];
                                   newArr[index].speciality = e.target.value;
                                   setFormData({...formData, referredTo: newArr});
                                }}>
                                   <option value="">Speciality</option>
                                   <option value="Anesthesiologist">Anesthesiologist</option>
                                   <option value="Cardiologist">Cardiologist</option>
                                   <option value="Counsellor">Counsellor</option>
                                   <option value="CVT surgeon">CVT surgeon</option>
                                   <option value="Dental">Dental</option>
                                   <option value="Dental surgeon">Dental surgeon</option>
                                   <option value="Dermatologist">Dermatologist</option>
                                   <option value="Diabetologist">Diabetologist</option>
                                   <option value="Dietician">Dietician</option>
                                   <option value="Endocrinologist">Endocrinologist</option>
                                   <option value="ENT">ENT</option>
                                   <option value="Foot Surgeon">Foot Surgeon</option>
                                   <option value="Gastroenterologist">Gastroenterologist</option>
                                   <option value="General Physician">General Physician</option>
                                   <option value="General Surgeon">General Surgeon</option>
                                   <option value="Gynecologist">Gynecologist</option>
                                   <option value="Hematologist">Hematologist</option>
                                   <option value="Hepatologist">Hepatologist</option>
                                   <option value="Immunologist">Immunologist</option>
                                   <option value="Nephrologist">Nephrologist</option>
                                   <option value="Neuro Physician">Neuro Physician</option>
                                   <option value="Neurologist">Neurologist</option>
                                   <option value="Neurosurgeon">Neurosurgeon</option>
                                   <option value="Nuclear Medicine">Nuclear Medicine</option>
                                   <option value="Nutritionist">Nutritionist</option>
                                   <option value="Oncologist">Oncologist</option>
                                   <option value="Ophthalmologist">Ophthalmologist</option>
                                   <option value="Ortho Surgeon">Ortho Surgeon</option>
                                   <option value="Orthopedician">Orthopedician</option>
                                   <option value="Pathologist">Pathologist</option>
                                   <option value="Pediatrician">Pediatrician</option>
                                   <option value="Physician">Physician</option>
                                   <option value="Physiotherapist">Physiotherapist</option>
                                   <option value="Plastic surgery">Plastic surgery</option>
                                   <option value="Podiatrist">Podiatrist</option>
                                   <option value="Psychiatrist">Psychiatrist</option>
                                   <option value="Psychologist">Psychologist</option>
                                   <option value="Pulmonologist">Pulmonologist</option>
                                   <option value="Radiologist">Radiologist</option>
                                   <option value="Retina Surgeon">Retina Surgeon</option>
                                   <option value="Surgeon">Surgeon</option>
                                   <option value="Surgical Gastrenterologist">Surgical Gastrenterologist</option>
                                   <option value="TAVI Specialist">TAVI Specialist</option>
                                   <option value="Urologist">Urologist</option>
                                   <option value="Vascular surgeon">Vascular surgeon</option>
                                </select>
                             </div>
                          </div>
                          <div className="col-auto">
                             <label className="form-label small text-secondary mb-1">Phone No</label>
                             <div className="input-group" style={{ width: '160px' }}>
                                <span className="input-group-text bg-white text-primary border-end-0" style={{ borderColor: '#dee2e6' }}>+91</span>
                                <input 
                                   type="text" 
                                   className="form-control border-start-0 ps-0" 
                                   placeholder="10-digit number" 
                                   maxLength={10}
                                   value={referral.phoneNo} 
                                   onChange={e => {
                                     const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                     const newArr = [...formData.referredTo];
                                     newArr[index].phoneNo = val;
                                     setFormData({...formData, referredTo: newArr});
                                   }} 
                                   style={{ borderColor: '#dee2e6' }} 
                                />
                             </div>
                          </div>
                          <div className="col-auto">
                             <label className="form-label small text-secondary mb-1">Purpose</label>
                             <div className="input-group" style={{ width: '200px' }}>
                                <span className="input-group-text bg-white text-primary border-end-0" style={{ borderColor: '#dee2e6' }}><i className="bi bi-card-text"></i></span>
                                <input type="text" className="form-control border-start-0 ps-0" placeholder="Purpose of referral" value={referral.purpose} onChange={e => {
                                   const newArr = [...formData.referredTo];
                                   newArr[index].purpose = e.target.value;
                                   setFormData({...formData, referredTo: newArr});
                                }} style={{ borderColor: '#dee2e6' }} />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* History */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                    <div className="mb-2">History</div>
                    <SectionActions
                      onClear={() => clearSection('historyDetails', { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] })}
                      onCopyPast={() => copyPrevSection('historyDetails')}
                      onSave={() => saveSectionTemplate('historyDetails')}
                      onLoad={() => loadSectionTemplate('historyDetails')}
                    />
                 </div>
                 <div className="flex-grow-1">
                    <button className="btn bg-white shadow-sm px-3 mb-3" style={{ borderColor: '#dee2e6' }} onClick={() => setShowHistoryDetails(!showHistoryDetails)}>
                       {showHistoryDetails ? '-' : '+'}
                    </button>
                    {showHistoryDetails && (
                      <div className="row g-3">
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Allergies</label>
                            <AutoCompleteTagInput 
                               tags={formData.historyDetails.allergies} 
                               setTags={(newTags) => setFormData({...formData, historyDetails: {...formData.historyDetails, allergies: newTags}})} 
                               type="ALLERGIES" 
                               placeholder="Allergies..." 
                            />
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Personal History</label>
                            <AutoCompleteTagInput 
                               tags={formData.historyDetails.personalHistory} 
                               setTags={(newTags) => setFormData({...formData, historyDetails: {...formData.historyDetails, personalHistory: newTags}})} 
                               type="PERSONAL_HISTORY" 
                               placeholder="Personal History..." 
                            />
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Past Medical History</label>
                            <AutoCompleteTagInput 
                               tags={formData.historyDetails.pastMedicalHistory} 
                               setTags={(newTags) => setFormData({...formData, historyDetails: {...formData.historyDetails, pastMedicalHistory: newTags}})} 
                               type="PAST_MEDICAL_HISTORY" 
                               placeholder="Past Medical History..." 
                            />
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Family History</label>
                            <AutoCompleteTagInput 
                               tags={formData.historyDetails.familyHistory} 
                               setTags={(newTags) => setFormData({...formData, historyDetails: {...formData.historyDetails, familyHistory: newTags}})} 
                               type="FAMILY_HISTORY" 
                               placeholder="Family History..." 
                            />
                         </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* Past Medication */}
              <div className="d-flex mb-4">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                    <div className="mb-1">Past Medication</div>
                    <SectionActions
                      onClear={() => clearSection('pastMedications', [])}
                      onCopyPast={() => copyPrevSection('pastMedications')}
                      onSave={() => saveSectionTemplate('pastMedications')}
                      onLoad={() => loadSectionTemplate('pastMedications')}
                    />
                 </div>
                 <div className="flex-grow-1 d-flex">
                    <AutoCompleteTagInput 
                       tags={formData.pastMedications} 
                       setTags={(newTags) => setFormData({...formData, pastMedications: newTags})} 
                       type="MEDICINE" 
                       placeholder="Past Medications..." 
                    />
                 </div>
              </div>

              {/* Physical Examination */}
              <div className="d-flex mb-5 pb-5">
                 <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                    <div className="mb-2">Physical Examination</div>
                    <SectionActions
                      onClear={() => clearSection('physicalExaminationDetails', { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' })}
                      onCopyPast={() => copyPrevSection('physicalExaminationDetails')}
                      onSave={() => saveSectionTemplate('physicalExaminationDetails')}
                      onLoad={() => loadSectionTemplate('physicalExaminationDetails')}
                    />
                 </div>
                 <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-3 mb-3">
                       <button className="btn bg-white shadow-sm px-3" style={{ borderColor: '#dee2e6' }} onClick={() => setShowPhysicalExamDetails(!showPhysicalExamDetails)}>
                          {showPhysicalExamDetails ? '-' : '+'}
                       </button>
                       {showPhysicalExamDetails && (
                         <div className="form-check d-flex align-items-center gap-2 m-0 ms-2">
                            <input className="form-check-input mt-0" type="checkbox" id="markAllNad" checked={formData.physicalExaminationDetails.isNad} onChange={handleNadToggle} style={{ width: '20px', height: '20px', borderColor: '#dee2e6', borderRadius: '4px' }} />
                            <label className="form-check-label text-dark" style={{ fontSize: '0.9rem' }} htmlFor="markAllNad">
                               Mark all fields as NAD
                            </label>
                         </div>
                       )}
                    </div>
                    {showPhysicalExamDetails && (
                      <div className="row g-4">
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Breast Examination</label>
                            <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.breast} onChange={e => setFormData({...formData, physicalExaminationDetails: {...formData.physicalExaminationDetails, breast: e.target.value}})}></textarea>
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Per Speculum</label>
                            <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perSpeculum} onChange={e => setFormData({...formData, physicalExaminationDetails: {...formData.physicalExaminationDetails, perSpeculum: e.target.value}})}></textarea>
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Per Abdominal Examination</label>
                            <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perAbdominal} onChange={e => setFormData({...formData, physicalExaminationDetails: {...formData.physicalExaminationDetails, perAbdominal: e.target.value}})}></textarea>
                         </div>
                         <div className="col-md-6">
                            <label className="form-label small text-dark fw-semibold mb-1">Per Vaginal Examination</label>
                            <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perVaginal} onChange={e => setFormData({...formData, physicalExaminationDetails: {...formData.physicalExaminationDetails, perVaginal: e.target.value}})}></textarea>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
           )}

           {/* Bottom Action Bar */}
           <div className="bg-light border-top px-4 py-3 d-flex justify-content-end align-items-center shadow-sm gap-3">
              <div className="d-flex align-items-center gap-3">
                 <select className="form-select form-select-sm bg-transparent shadow-none" style={{ width: '100px', borderColor: '#ccc' }}>
                    <option>English</option>
                 </select>
                 
                 <div className="position-relative" title="Send WhatsApp">
                    <i className="bi bi-whatsapp cursor-pointer fs-5 text-success" onClick={() => {
                       let phone = patientInfo?.phone;
                       if (phone) {
                          if (phone.length === 10) phone = '91' + phone;
                          window.open(`https://wa.me/${phone}`, '_blank');
                       } else {
                          alert('Patient phone number not found');
                       }
                    }}></i>
                 </div>
                 
                 <i className="bi bi-envelope cursor-pointer fs-5 text-primary" title="Email"></i>
                 
                 <i className="bi bi-printer cursor-pointer fs-5 text-primary" onClick={() => window.open(`/doctor/visit/${appointmentId}/print`, '_blank')} title="Print"></i>
              </div>
              <div className="d-flex gap-2 ms-2">
                 <button className="btn btn-primary px-4 fw-semibold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: '#1a237e', borderColor: '#1a237e' }} onClick={() => handleSave(false)}>
                    <i className="bi bi-save"></i> Save
                 </button>
                 <button className="btn btn-danger px-4 fw-semibold shadow-sm" onClick={() => handleSave(true)}>End Consultation</button>
              </div>
           </div>
         </div>
         )}
        </div>
      </div>
      <TemplateManagerModal 
        isOpen={templateModal.isOpen} 
        onClose={() => setTemplateModal(p => ({ ...p, isOpen: false }))} 
        mode={templateModal.mode} 
        storageKey={templateModal.storageKey} 
        title={templateModal.title} 
        dataToSave={templateModal.dataToSave} 
        onLoad={templateModal.onLoad} 
      />
    </div>
  );
};

export default VisitPad;
