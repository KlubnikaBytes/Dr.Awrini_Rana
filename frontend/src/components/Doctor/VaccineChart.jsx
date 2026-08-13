import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';
import { ArrowLeft, Plus, Printer, Trash2, MoreVertical, ChevronDown } from 'lucide-react';
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
  { age: 'Birth', immunization: 'BCG', nameOfVaccine: '', dueDate: '1965-06-26', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: 'Birth', immunization: 'Hepatitis B-1 (BD)', nameOfVaccine: '', dueDate: '1965-06-26', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: 'Birth', immunization: 'OPV', nameOfVaccine: '', dueDate: '1965-06-26', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'DTwP/DTaP-1', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Hep B-2', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Hib-1', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'IPV-1', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'PCV-1', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 week', immunization: 'Rotavirus-1', nameOfVaccine: '', dueDate: '1965-08-07', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'DTwP/DTaP-2', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Hep B-3', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Hib-2', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'IPV-2', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'PCV-2', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10 week', immunization: 'Rotavirus-2', nameOfVaccine: '', dueDate: '1965-09-04', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'DTwP/DTaP-3', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Hep B-4', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Hib-3', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'IPV-3', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'PCV-3', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '14 week', immunization: 'Rotavirus-3', nameOfVaccine: '', dueDate: '1965-10-02', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6 month', immunization: 'Influenza (IIV)-1', nameOfVaccine: '', dueDate: '1965-12-23', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '6-9 month', immunization: 'Typhoid conjugate vaccine', nameOfVaccine: '', dueDate: '1965-12-23', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '7 month', immunization: 'Influenza (IIV)-2', nameOfVaccine: '', dueDate: '1966-01-22', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '9 month', immunization: 'MMR-1', nameOfVaccine: '', dueDate: '1966-03-23', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '12 month', immunization: 'Hepatitis A', nameOfVaccine: '', dueDate: '1966-06-26', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'MMR-2', nameOfVaccine: '', dueDate: '1966-09-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'PCV booster', nameOfVaccine: '', dueDate: '1966-09-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '15 month', immunization: 'Varicella-1', nameOfVaccine: '', dueDate: '1966-09-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'DTwP/DTaP-B1', nameOfVaccine: '', dueDate: '1966-10-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'Hib-B1', nameOfVaccine: '', dueDate: '1966-10-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '16-18 month', immunization: 'IPV-B1', nameOfVaccine: '', dueDate: '1966-10-19', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '18-19 month', immunization: 'Hep A-2', nameOfVaccine: '', dueDate: '1966-12-18', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '18-19 month', immunization: 'Varicella-2', nameOfVaccine: '', dueDate: '1966-12-18', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'DTwP/DTaP-B2', nameOfVaccine: '', dueDate: '1969-06-25', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'IPV-B2', nameOfVaccine: '', dueDate: '1969-06-25', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '4-6 year', immunization: 'MMR-3', nameOfVaccine: '', dueDate: '1969-06-25', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10-12 year', immunization: 'HPV', nameOfVaccine: '', dueDate: '1975-06-24', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' },
  { age: '10-12 year', immunization: 'Tdap', nameOfVaccine: '', dueDate: '1975-06-24', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Pediatric' }
];

const defaultMaternalVaccines = [
  { age: '16-20 weeks', immunization: 'Tetanus, Diphtheria (Td)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' },
  { age: '27-36 weeks', immunization: 'Tetanus, Diphtheria, Pertussis (Tdap)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' },
  { age: '28-32 weeks', immunization: 'Influenza (Flu vaccine)', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Maternal' }
];

const defaultOtherVaccines = [];

const VaccineChart = ({ patientId, onBack }) => {
  const [activeTab, setActiveTab] = useState('Pediatric');
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
    fetchVaccines();
  }, [patientId]);

  const fetchVaccines = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getPatientVaccines(patientId);
      if (data && data.length > 0) {
        setVaccines(data);
      } else {
        // Try fetching from templates
        const templates = await doctorService.getVaccineTemplates();
        if (templates && templates.length > 0) {
           let allTemplateVaccines = [];
           templates.forEach(t => {
             allTemplateVaccines = [...allTemplateVaccines, ...t.vaccines];
           });
           setVaccines(allTemplateVaccines.length > 0 ? allTemplateVaccines : [...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]);
        } else {
           setVaccines([...defaultPediatricVaccines, ...defaultMaternalVaccines, ...defaultOtherVaccines]);
        }
      }
    } catch (error) {
      console.error('Error fetching vaccines:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await doctorService.savePatientVaccines(patientId, vaccines);
      alert('Vaccines saved successfully');
    } catch (error) {
      console.error('Error saving vaccines:', error);
      alert('Failed to save vaccines');
    }
  };

  const updateVaccine = (indexToUpdate, field, value) => {
    setVaccines(prev => prev.map((vac, idx) => idx === indexToUpdate ? { ...vac, [field]: value } : vac));
  };

  const addOtherVaccine = () => {
    setVaccines([
      ...vaccines, 
      { age: '', immunization: '', nameOfVaccine: '', dueDate: '', administeredDate: '', batchNumber: '', siteAdministered: '', routeOfAdministration: '', doseVolume: '', remarks: '', reminders: false, category: 'Other' }
    ]);
    setActiveTab('Other');
  };

  const deleteVaccine = (indexToDelete) => {
    setVaccines(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const toggleField = (field) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveTemplateForPatient = (updatedTemplate) => {
    // Replace current tab's vaccines with updated template
    const otherVaccines = vaccines.filter(v => v.category !== activeTab);
    const newVaccines = [...otherVaccines, ...updatedTemplate];
    setVaccines(newVaccines);
    setIsUpdateModalOpen(false);
  };

  const handleSaveTemplateForAll = async (updatedTemplate) => {
    try {
      const payload = {
        [activeTab.toLowerCase()]: updatedTemplate
      };
      await doctorService.saveVaccineTemplates(payload);
      handleSaveTemplateForPatient(updatedTemplate);
      alert('Template saved for all patients.');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template.');
    }
  };

  const displayedVaccines = vaccines.filter(v => v.category === activeTab);
  
  // Calculate true indices for the filtered list so we can update the main array correctly
  const displayedVaccinesWithOriginalIndex = displayedVaccines.map(v => {
    return {
      ...v,
      originalIndex: vaccines.findIndex(orig => orig === v)
    };
  });

  if (loading) return <div className="p-5 text-center">Loading Vaccination Chart...</div>;

  return (
    <div className="d-flex flex-column bg-white w-100 h-100">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between p-3 sticky-top bg-white border-bottom" style={{ zIndex: 10 }}>
          <div className="d-flex align-items-center gap-4">
            <button className="btn btn-link text-dark p-0" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
            <h5 className="mb-0 fw-bold">Vaccination Chart</h5>
            
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
                className="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-1"
                onClick={addOtherVaccine}
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
            
            <div className="form-check form-switch ms-2 mb-0">
              <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault" />
            </div>
            <button
              className="btn btn-light btn-sm text-secondary rounded-pill d-flex align-items-center gap-1 ms-2 border"
              onClick={() => handleVaccinePrint(tableRef, `${activeTab} Vaccination Chart`)}
            >
              <Printer size={14} /> Print
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
          <div ref={tableRef} className="flex-grow-1 overflow-auto p-0 position-relative">
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
                {displayedVaccinesWithOriginalIndex.map((vac, i) => {
                  const showAge = i === 0 || vac.age !== displayedVaccinesWithOriginalIndex[i - 1].age;
                  
                  return (
                    <tr key={i} className="border-bottom" style={{ borderColor: '#f1f5f9' }}>
                      <td className="ps-4 fw-medium text-dark">{showAge || activeTab === 'Other' ? (
                         activeTab === 'Other' ? (
                           <input type="text" className="form-control form-control-sm border-0 shadow-none bg-transparent px-0" placeholder="Click to edit" value={vac.age} onChange={e => updateVaccine(vac.originalIndex, 'age', e.target.value)} />
                         ) : vac.age
                      ) : ''}</td>
                      
                      <td>
                        {activeTab === 'Other' ? (
                           <input type="text" className="form-control form-control-sm border-0 shadow-none bg-transparent px-0" placeholder="Click to edit" value={vac.immunization} onChange={e => updateVaccine(vac.originalIndex, 'immunization', e.target.value)} />
                        ) : vac.immunization}
                      </td>
                      
                      <td>
                        <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.nameOfVaccine} onChange={e => updateVaccine(vac.originalIndex, 'nameOfVaccine', e.target.value)} style={{ backgroundColor: vac.nameOfVaccine ? 'white' : 'transparent' }} />
                      </td>
                      
                      <td>
                         <input type="date" className="form-control form-control-sm border-0 shadow-none px-0" value={vac.dueDate ? vac.dueDate.split('T')[0] : ''} onChange={e => updateVaccine(vac.originalIndex, 'dueDate', e.target.value)} style={{ backgroundColor: 'transparent', color: vac.dueDate ? '#212529' : '#adb5bd' }} />
                      </td>
                      
                      <td>
                         <input type="date" className="form-control form-control-sm border-0 shadow-none px-0" value={vac.administeredDate ? vac.administeredDate.split('T')[0] : ''} onChange={e => updateVaccine(vac.originalIndex, 'administeredDate', e.target.value)} style={{ backgroundColor: 'transparent', color: vac.administeredDate ? '#212529' : '#adb5bd' }} />
                      </td>
                      
                      <td>
                        <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.batchNumber} onChange={e => updateVaccine(vac.originalIndex, 'batchNumber', e.target.value)} style={{ backgroundColor: vac.batchNumber ? 'white' : 'transparent' }} />
                      </td>
                      
                      {visibleFields.siteAdministered && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.siteAdministered} onChange={e => updateVaccine(vac.originalIndex, 'siteAdministered', e.target.value)} style={{ backgroundColor: vac.siteAdministered ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.routeOfAdministration && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.routeOfAdministration} onChange={e => updateVaccine(vac.originalIndex, 'routeOfAdministration', e.target.value)} style={{ backgroundColor: vac.routeOfAdministration ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.doseVolume && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.doseVolume} onChange={e => updateVaccine(vac.originalIndex, 'doseVolume', e.target.value)} style={{ backgroundColor: vac.doseVolume ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      {visibleFields.remarks && (
                        <td>
                          <input type="text" className="form-control form-control-sm border-0 shadow-none text-secondary px-2" placeholder="Click to edit" value={vac.remarks} onChange={e => updateVaccine(vac.originalIndex, 'remarks', e.target.value)} style={{ backgroundColor: vac.remarks ? 'white' : 'transparent' }} />
                        </td>
                      )}
                      
                      <td className="text-center">
                        <input className="form-check-input mt-1" type="checkbox" checked={vac.reminders} onChange={e => updateVaccine(vac.originalIndex, 'reminders', e.target.checked)} style={{ borderColor: '#dee2e6' }} />
                      </td>
                      
                      <td className="text-center">
                        {activeTab === 'Other' ? (
                           <button className="btn btn-link text-danger p-0 shadow-none" onClick={() => deleteVaccine(vac.originalIndex)}>
                              <Trash2 size={14} />
                           </button>
                        ) : (
                           <button className="btn btn-link text-danger p-0 shadow-none invisible">
                              <Trash2 size={14} />
                           </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {displayedVaccinesWithOriginalIndex.length === 0 && (
                  <tr>
                    <td colSpan="12" className="text-center py-5 text-muted">No vaccines found for {activeTab}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer Save Button */}
          <div className="p-3 border-top bg-white d-flex justify-content-end sticky-bottom z-3">
            <button className="btn btn-primary px-4 rounded-pill" onClick={handleSave}>Save</button>
          </div>
        </>
      )}
    </div>
  );
};

export default VaccineChart;
