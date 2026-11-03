import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';
import { ArrowLeft, Plus, Printer, Trash2, MoreVertical, ChevronDown, Save, Check } from 'lucide-react';
import UpdateChartModal from './UpdateChartModal';

const handleVaccinePrint = (tableRef, title) => {
  if (!tableRef.current) return;
  const content = tableRef.current.innerHTML;
  const win = window.open('', '_blank', 'width=1100,height=800');
  win.document.write(`<!DOCTYPE html><html><head><title>${title || 'Vaccination Chart'}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"/>
    <style>body{padding:20px;font-size:12px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #dee2e6;padding:5px 8px;font-size:11px} thead th{background:#f8f9fa;font-weight:600}</style>
    </head><body><h5 style="margin-bottom:12px">${title || 'Vaccination Chart'}</h5>${content}</body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
};

const defaultPediatricVaccines = [
  { age: 'Birth', immunization: 'BCG', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: 'Birth', immunization: 'Hepatitis B-1 (BD)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: 'Birth', immunization: 'OPV', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'DTwP/DTaP-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Hep B-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Hib-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'IPV-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'PCV-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Rotavirus-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'DTwP/DTaP-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Hep B-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Hib-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'IPV-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'PCV-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Rotavirus-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'DTwP/DTaP-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Hep B-4', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Hib-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'IPV-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'PCV-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Rotavirus-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 month', immunization: 'Influenza (IIV)-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6-9 month', immunization: 'Typhoid conjugate vaccine', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '7 month', immunization: 'Influenza (IIV)-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '9 month', immunization: 'MMR-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '12 month', immunization: 'Hepatitis A', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'MMR-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'PCV booster', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'Varicella-1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'DTwP/DTaP-B1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'Hib-B1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'IPV-B1', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '18-19 month', immunization: 'Hep A-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '18-19 month', immunization: 'Varicella-2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'DTwP/DTaP-B2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'IPV-B2', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'MMR-3', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10-12 year', immunization: 'HPV', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10-12 year', immunization: 'Tdap', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' }
];

const defaultMaternalVaccines = [
  { age: '16-20 weeks', immunization: 'Tetanus, Diphtheria (Td)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' },
  { age: '27-36 weeks', immunization: 'Tetanus, Diphtheria, Pertussis (Tdap)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' },
  { age: '28-32 weeks', immunization: 'Influenza (Flu vaccine)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' }
];

const defaultOtherVaccines = [];

const assignVacIds = (list) => {
  return (list || []).map((vac, idx) => ({
    ...vac,
    _vacId: vac._vacId || ('vac_' + (vac.category || 'vac') + '_' + idx + '_' + Math.random().toString(36).substr(2, 7))
  }));
};

const VaccineChart = ({ patientId, patientInfo, onBack }) => {
  const effectivePatientId = patientId || patientInfo?._id || patientInfo?.patientId || patientInfo?.id;

  const [activeTab, setActiveTab] = useState('Pediatric');
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'Saving...', 'Saved!'
  
  // Select Fields state
  const [showSelectFields, setShowSelectFields] = useState(false);
  const [visibleFields, setVisibleFields] = useState({
    siteAdministered: true,
    routeOfAdministration: true,
    doseVolume: true,
    remarks: true
  });
  
  // Update Chart Modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  // Maternal specific state
  const [lmpDate, setLmpDate] = useState('');
  const [eddDate, setEddDate] = useState('');

  const selectFieldsRef = useRef(null);
  const tableRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const vaccinesRef = useRef(vaccines);
  vaccinesRef.current = vaccines;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectFieldsRef.current && !selectFieldsRef.current.contains(event.target)) {
        setShowSelectFields(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (effectivePatientId) {
      fetchVaccines(effectivePatientId);
    } else {
      setVaccines(assignVacIds([...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]));
      setLoading(false);
    }
  }, [effectivePatientId]);

  // Listen to global save event from VisitPad footer save button
  useEffect(() => {
    const handleGlobalSave = () => {
      if (vaccinesRef.current && vaccinesRef.current.length > 0) {
        handleSave(vaccinesRef.current, false);
      }
    };
    window.addEventListener('hp-save-vaccines', handleGlobalSave);
    return () => window.removeEventListener('hp-save-vaccines', handleGlobalSave);
  }, [effectivePatientId]);

  const fetchVaccines = async (targetId) => {
    setLoading(true);
    try {
      const data = await doctorService.getPatientVaccines(targetId);
      if (data && data.length > 0) {
        setVaccines(assignVacIds(data));
      } else {
        // Try fetching from templates
        const templates = await doctorService.getVaccineTemplates();
        if (templates && templates.length > 0) {
           let allTemplateVaccines = [];
           templates.forEach(t => {
             allTemplateVaccines = [...allTemplateVaccines, ...(t.vaccines || [])];
           });
           setVaccines(assignVacIds(allTemplateVaccines.length > 0 ? allTemplateVaccines : [...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]));
        } else {
           setVaccines(assignVacIds([...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]));
        }
      }
    } catch (error) {
      console.error('Error fetching vaccines:', error);
      setVaccines(assignVacIds([...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]));
    }
    setLoading(false);
  };

  const handleSave = async (customVaccines = null, showNotification = true) => {
    const targetId = effectivePatientId;
    if (!targetId) {
      console.warn('Cannot save vaccines: patient ID is not available');
      return;
    }
    const toSave = customVaccines || vaccines;
    setSaveStatus('Saving...');
    try {
      // Clean temporary fields before sending to MongoDB
      const cleanVaccines = toSave.map(({ _vacId, originalIndex, tempId, ...rest }) => rest);
      await doctorService.savePatientVaccines(targetId, cleanVaccines);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2500);
      if (showNotification) {
        // success indication
      }
    } catch (error) {
      console.error('Error saving vaccines:', error);
      setSaveStatus('Save Failed');
      setTimeout(() => setSaveStatus(''), 3000);
      if (showNotification) {
        alert('Failed to save vaccines: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const triggerDebouncedSave = (newVaccines) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('Saving...');
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(newVaccines, false);
    }, 1200);
  };

  const updateVaccine = (vacId, field, value) => {
    setVaccines(prev => {
      const next = prev.map(vac => vac._vacId === vacId ? { ...vac, [field]: value } : vac);
      triggerDebouncedSave(next);
      return next;
    });
  };

  const addVaccine = () => {
    const newVac = {
      _vacId: 'vac_' + activeTab + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      age: '',
      immunization: '',
      nameOfVaccine: '',
      dueDate: '',
      administeredDate: '',
      batchNumber: '',
      siteAdministered: '',
      routeOfAdministration: '',
      doseVolume: '',
      remarks: '',
      reminders: false,
      category: activeTab
    };
    setVaccines(prev => {
      const next = [...prev, newVac];
      triggerDebouncedSave(next);
      return next;
    });
  };

  const deleteVaccine = (vacId) => {
    setVaccines(prev => {
      const next = prev.filter(vac => vac._vacId !== vacId);
      triggerDebouncedSave(next);
      return next;
    });
  };

  const toggleField = (field) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveTemplateForPatient = async (updatedTemplate) => {
    const otherVaccines = vaccines.filter(v => (v.category || 'Other') !== activeTab);
    const withIds = assignVacIds(updatedTemplate.map(t => ({ ...t, category: activeTab })));
    const newVaccines = [...otherVaccines, ...withIds];
    setVaccines(newVaccines);
    setIsUpdateModalOpen(false);
    await handleSave(newVaccines, true);
  };

  const handleSaveTemplateForAll = async (updatedTemplate) => {
    try {
      const payload = {
        [activeTab.toLowerCase()]: updatedTemplate
      };
      await doctorService.saveVaccineTemplates(payload);
      await handleSaveTemplateForPatient(updatedTemplate);
      alert('Template saved for all patients.');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template.');
    }
  };

  const displayedVaccines = vaccines.filter(v => (v.category || 'Other') === activeTab);

  if (loading) return <div className="p-5 text-center text-muted">Loading Vaccination Chart...</div>;

  return (
    <div className="d-flex flex-column bg-white w-100 h-100 position-relative">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between p-3 sticky-top bg-white border-bottom shadow-sm" style={{ zIndex: 10 }}>
          <div className="d-flex align-items-center gap-4">
            <button className="btn btn-link text-dark p-0" onClick={onBack} title="Back to Consultation">
              <ArrowLeft size={20} />
            </button>
            <h5 className="mb-0 fw-bold text-dark">Vaccination Chart</h5>
            
            <div className="d-flex gap-3 ms-4">
              <div 
                className={`cursor-pointer fw-semibold ${activeTab === 'Pediatric' ? 'text-primary border-bottom border-primary border-2 pb-1' : 'text-secondary'}`}
                onClick={() => setActiveTab('Pediatric')}
              >
                Pediatric Vaccine
              </div>
              <div 
                className={`cursor-pointer fw-semibold ${activeTab === 'Maternal' ? 'text-primary border-bottom border-primary border-2 pb-1' : 'text-secondary'}`}
                onClick={() => setActiveTab('Maternal')}
              >
                Maternal Vaccine
              </div>
              <div 
                className={`cursor-pointer fw-semibold ${activeTab === 'Other' ? 'text-primary border-bottom border-primary border-2 pb-1' : 'text-secondary'}`}
                onClick={() => setActiveTab('Other')}
              >
                Other Vaccine
              </div>
            </div>
          </div>
          
          {!isUpdateModalOpen && (
            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-1 shadow-sm"
                onClick={addVaccine}
              >
                <Plus size={14} /> Add Vaccine
              </button>
              <div className="position-relative" ref={selectFieldsRef}>
              <button 
                className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 bg-white"
                onClick={() => setShowSelectFields(!showSelectFields)}
              >
                Select Fields <ChevronDown size={14} className="ms-1" />
              </button>
              {showSelectFields && (
                <div className="position-absolute bg-white border shadow rounded p-2 mt-1" style={{ top: '100%', right: 0, zIndex: 1050, minWidth: '220px' }}>
                  <div className="d-flex flex-column gap-2 mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="field-site" checked={visibleFields.siteAdministered} onChange={() => toggleField('siteAdministered')} />
                      <label className="form-check-label text-dark small" htmlFor="field-site">Site Administered</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="field-route" checked={visibleFields.routeOfAdministration} onChange={() => toggleField('routeOfAdministration')} />
                      <label className="form-check-label text-dark small" htmlFor="field-route">Route of Administration</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="field-dose" checked={visibleFields.doseVolume} onChange={() => toggleField('doseVolume')} />
                      <label className="form-check-label text-dark small" htmlFor="field-dose">Dose Volume</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="field-remarks" checked={visibleFields.remarks} onChange={() => toggleField('remarks')} />
                      <label className="form-check-label text-dark small" htmlFor="field-remarks">Remarks</label>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm w-100 rounded" onClick={() => setShowSelectFields(false)}>Save</button>
                </div>
              )}
            </div>
            
            <button className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 bg-white" onClick={() => setIsUpdateModalOpen(true)}>
              Update Chart
            </button>
            
            <button
              className="btn btn-light btn-sm text-secondary rounded-pill d-flex align-items-center gap-1 ms-1 border"
              onClick={() => handleVaccinePrint(tableRef, `${activeTab} Vaccination Chart`)}
            >
              <Printer size={14} /> Print
            </button>

            {/* Prominent Header Save Button */}
            <button
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-1 ms-2 px-3 fw-semibold shadow-sm transition-all ${saveStatus === 'Saved!' ? 'btn-success' : 'btn-primary'}`}
              onClick={() => handleSave(vaccines, true)}
              disabled={saveStatus === 'Saving...'}
            >
              {saveStatus === 'Saved!' ? <Check size={14} /> : <Save size={14} />} {saveStatus || 'Save Chart'}
            </button>
          </div>
          )}
        </div>

      {!isUpdateModalOpen && activeTab === 'Maternal' && (
        <div className="d-flex align-items-center gap-4 px-4 py-2 bg-light border-bottom shadow-sm">
          <div className="d-flex align-items-center gap-2">
            <label className="fw-medium text-secondary mb-0" style={{ fontSize: '0.85rem' }}>LMP Date</label>
            <input 
              type="date" 
              className="form-control form-control-sm border shadow-none bg-white" 
              value={lmpDate} 
              onChange={e => setLmpDate(e.target.value)} 
              style={{ width: '140px' }} 
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="fw-medium text-secondary mb-0" style={{ fontSize: '0.85rem' }}>EDD Date</label>
            <input 
              type="date" 
              className="form-control form-control-sm border shadow-none bg-white" 
              value={eddDate} 
              onChange={e => setEddDate(e.target.value)} 
              style={{ width: '140px' }} 
            />
          </div>
        </div>
      )}

      {isUpdateModalOpen ? (
        <div className="flex-grow-1 d-flex flex-column h-100">
          <UpdateChartModal 
            isOpen={isUpdateModalOpen} 
            onClose={() => setIsUpdateModalOpen(false)} 
            activeTab={activeTab}
            currentVaccines={vaccines}
            onSaveForPatient={handleSaveTemplateForPatient}
            onSaveForAll={handleSaveTemplateForAll}
          />
        </div>
      ) : (
        <>
          {/* Table Area */}
          <div ref={tableRef} className="flex-grow-1 overflow-auto p-0 position-relative" style={{ paddingBottom: '90px' }}>
            <table className="table table-borderless table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="sticky-top bg-white border-bottom shadow-sm" style={{ zIndex: 5 }}>
                <tr className="text-secondary">
                  <th className="fw-semibold ps-4" style={{ color: '#4a5568', width: '80px' }}>Age</th>
                  <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '150px' }}>Immunization</th>
                  <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '120px' }}>Name of Vaccine</th>
                  <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '110px' }}>Due Date</th>
                  <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '130px' }}>Administered Date</th>
                  <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '100px' }}>Batch Number</th>
                  {visibleFields.siteAdministered && <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '120px' }}>Site Administered</th>}
                  {visibleFields.routeOfAdministration && <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '150px' }}>Route of Administration</th>}
                  {visibleFields.doseVolume && <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '100px' }}>Dose Volume</th>}
                  {visibleFields.remarks && <th className="fw-semibold" style={{ color: '#4a5568', minWidth: '100px' }}>Remarks</th>}
                  <th className="fw-semibold text-center" style={{ color: '#4a5568', width: '80px' }}>Reminders</th>
                  <th className="fw-semibold text-center" style={{ width: '40px' }}><MoreVertical size={14}/></th>
                </tr>
              </thead>
              <tbody>
                {displayedVaccines.map((vac, i) => {
                  const showAge = i === 0 || vac.age !== displayedVaccines[i - 1].age;
                  
                  return (
                    <tr key={vac._vacId || i} className="border-bottom" style={{ borderColor: '#f1f5f9' }}>
                      <td className="ps-4 fw-medium text-dark">{showAge || activeTab === 'Other' ? (
                         activeTab === 'Other' ? (
                           <input type="text" className="form-control form-control-sm border-0 shadow-none bg-transparent px-0" placeholder="Click to edit" value={vac.age || ''} onChange={e => updateVaccine(vac._vacId, 'age', e.target.value)} />
                         ) : (vac.age || '')
                      ) : ''}</td>
                      
                      <td>
                        {activeTab === 'Other' ? (
                           <input type="text" className="form-control form-control-sm border-0 shadow-none bg-transparent px-0" placeholder="Click to edit" value={vac.immunization || ''} onChange={e => updateVaccine(vac._vacId, 'immunization', e.target.value)} />
                        ) : (vac.immunization || '')}
                      </td>
                      
                      <td>
                        <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.nameOfVaccine || ''} onChange={e => updateVaccine(vac._vacId, 'nameOfVaccine', e.target.value)} style={{ backgroundColor: vac.nameOfVaccine ? 'white' : 'transparent' }} />
                      </td>
                      
                      <td>
                         <input type="date" className="form-control form-control-sm border-0 shadow-none px-0" value={vac.dueDate ? vac.dueDate.split('T')[0] : ''} onChange={e => updateVaccine(vac._vacId, 'dueDate', e.target.value)} style={{ backgroundColor: 'transparent', color: vac.dueDate ? '#212529' : '#adb5bd' }} />
                      </td>
                      
                      <td>
                         <input type="date" className="form-control form-control-sm border-0 shadow-none px-0" value={vac.administeredDate ? vac.administeredDate.split('T')[0] : ''} onChange={e => updateVaccine(vac._vacId, 'administeredDate', e.target.value)} style={{ backgroundColor: 'transparent', color: vac.administeredDate ? '#212529' : '#adb5bd' }} />
                      </td>
                      
                      <td>
                        <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.batchNumber || ''} onChange={e => updateVaccine(vac._vacId, 'batchNumber', e.target.value)} style={{ backgroundColor: vac.batchNumber ? 'white' : 'transparent' }} />
                      </td>
                      
                      {visibleFields.siteAdministered && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.siteAdministered || ''} onChange={e => updateVaccine(vac._vacId, 'siteAdministered', e.target.value)} style={{ backgroundColor: vac.siteAdministered ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.routeOfAdministration && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.routeOfAdministration || ''} onChange={e => updateVaccine(vac._vacId, 'routeOfAdministration', e.target.value)} style={{ backgroundColor: vac.routeOfAdministration ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.doseVolume && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.doseVolume || ''} onChange={e => updateVaccine(vac._vacId, 'doseVolume', e.target.value)} style={{ backgroundColor: vac.doseVolume ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.remarks && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.remarks || ''} onChange={e => updateVaccine(vac._vacId, 'remarks', e.target.value)} style={{ backgroundColor: vac.remarks ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      <td className="text-center">
                        <input className="form-check-input mt-1" type="checkbox" checked={Boolean(vac.reminders)} onChange={e => updateVaccine(vac._vacId, 'reminders', e.target.checked)} style={{ borderColor: '#dee2e6' }} />
                      </td>
                      
                      <td className="text-center">
                        <button className="btn btn-link text-danger p-0 shadow-none" title="Delete vaccine" onClick={() => deleteVaccine(vac._vacId)}>
                           <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {displayedVaccines.length === 0 && (
                  <tr>
                    <td colSpan="12" className="text-center py-5 text-muted">
                      No vaccines found for {activeTab}. Click "+ Add Vaccine" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer Save Area (above fixed bottom action bar) */}
          <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center sticky-bottom z-3" style={{ marginBottom: '60px' }}>
            <span className="small text-muted">{saveStatus ? `Status: ${saveStatus}` : 'All vaccine changes auto-save'}</span>
            <button className="btn btn-primary px-4 rounded-pill fw-semibold shadow-sm" onClick={() => handleSave(vaccines, true)}>
              {saveStatus === 'Saving...' ? 'Saving...' : 'Save Chart'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VaccineChart;
