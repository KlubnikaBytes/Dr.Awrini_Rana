import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, Save, X } from 'lucide-react';
import labCatalogService from '../../services/labCatalogService';

const LabServicesManager = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Section edit state
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({ section: '', price: 0, unit: '', safeRange: '', impressionTemplate: '' });
  const [showAddSection, setShowAddSection] = useState(false);

  // Expanded states
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedServices, setExpandedServices] = useState({});

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const data = await labCatalogService.getCatalogs();
      setCatalogs(data || []);
    } catch (e) {
      console.error('Error fetching lab catalogs:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleService = (id) => {
    setExpandedServices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Section Handlers
  const handleSaveSection = async () => {
    if (!sectionForm.section.trim()) return;
    try {
      if (editingSectionId) {
        await labCatalogService.updateCatalog(editingSectionId, sectionForm);
      } else {
        await labCatalogService.createCatalog(sectionForm);
      }
      setEditingSectionId(null);
      setShowAddSection(false);
      setSectionForm({ section: '', price: 0, unit: '', safeRange: '', impressionTemplate: '' });
      fetchCatalogs();
    } catch (e) {
      alert('Failed to save section: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this entire section? This will remove all services under it.')) return;
    try {
      await labCatalogService.deleteCatalog(id);
      fetchCatalogs();
    } catch (e) {
      alert('Failed to delete section.');
    }
  };

  const ServiceRow = ({ catalogId, service, sIndex, updateService, deleteService }) => {
    const isNew = !service.name;
    const [form, setForm] = useState(service);
    const [isEditing, setIsEditing] = useState(isNew);

    const onChange = (field, val) => {
      setForm(f => ({ ...f, [field]: val }));
    };

    const onSave = () => {
      if (!form.name.trim()) return;
      updateService(sIndex, form);
      setIsEditing(false);
    };
    
    const onCancel = () => {
      if (isNew) {
        deleteService(sIndex);
      } else {
        setForm(service);
        setIsEditing(false);
      }
    };

    if (!isEditing) {
      return (
        <div className="d-flex align-items-center justify-content-between mb-2 px-3 py-2 rounded border" style={{ backgroundColor: '#fff' }}>
          <div className="d-flex align-items-center gap-3 flex-grow-1">
            <span className="fw-semibold" style={{ fontSize: '0.9rem', color: '#1e293b' }}>{service.name}</span>
            {service.price > 0 && <span className="badge" style={{ backgroundColor:'#e0f2fe', color:'#0369a1' }}>₹{service.price}</span>}
            {service.unit && <span className="text-secondary small">Unit: {service.unit}</span>}
            {service.safeRange && <span className="text-secondary small">Ref: {service.safeRange}</span>}
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm text-secondary p-1" onClick={() => setIsEditing(true)}><Edit3 size={15}/></button>
            <button className="btn btn-sm text-danger p-1" onClick={() => deleteService(sIndex)}><Trash2 size={15}/></button>
          </div>
        </div>
      );
    }

    return (
      <div className="row g-2 align-items-center mb-2 px-2 py-2 rounded" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="col-5">
          <input className="form-control form-control-sm" placeholder="Sub-test name (e.g., USG1)" value={form.name} onChange={e => onChange('name', e.target.value)} />
        </div>
        <div className="col-2">
          <input className="form-control form-control-sm" type="number" placeholder="Price (₹)" value={form.price} onChange={e => onChange('price', e.target.valueAsNumber || 0)} />
        </div>
        <div className="col-2">
          <input className="form-control form-control-sm" placeholder="Unit (e.g. mg/dL)" value={form.unit || ''} onChange={e => onChange('unit', e.target.value)} />
        </div>
        <div className="col-2">
          <input className="form-control form-control-sm" placeholder="Safe Range (e.g. 4-11)" value={form.safeRange || ''} onChange={e => onChange('safeRange', e.target.value)} />
        </div>
        <div className="col-1 text-end d-flex gap-1 justify-content-end">
          <button className="btn btn-sm btn-success px-2 py-1" onClick={onSave}><Save size={14}/></button>
          <button className="btn btn-sm btn-outline-secondary px-2 py-1" onClick={onCancel}><X size={14}/></button>
        </div>
      </div>
    );
  };


  const CatalogSection = ({ catalog }) => {
    const expanded = expandedSections[catalog._id];

    const addService = () => {
      const services = [...catalog.services, { name: '', price: 0, unit: '', safeRange: '' }];
      labCatalogService.updateCatalog(catalog._id, { services });
      fetchCatalogs();
      setExpandedSections(prev => ({ ...prev, [catalog._id]: true }));
    };

    const updateService = async (idx, svcData) => {
      const services = [...catalog.services];
      services[idx] = svcData;
      await labCatalogService.updateCatalog(catalog._id, { services });
      fetchCatalogs();
    };

    const deleteService = async (idx) => {
      if(!window.confirm('Delete this service?')) return;
      const services = [...catalog.services];
      services.splice(idx, 1);
      await labCatalogService.updateCatalog(catalog._id, { services });
      fetchCatalogs();
    };

    return (
      <div className="card shadow-sm mb-3 border-0">
        <div className="card-header bg-white d-flex align-items-center justify-content-between p-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ cursor: 'pointer' }} onClick={() => toggleSection(catalog._id)}>
            <div className="bg-light p-1 rounded text-secondary me-1">
              {expanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            </div>
            <h6 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>{catalog.section}</h6>
            {catalog.price > 0 && <span className="badge ms-2" style={{ backgroundColor:'#e0f2fe', color:'#0369a1' }}>₹{catalog.price}</span>}
            {catalog.unit && <span className="text-secondary ms-2 small">{catalog.unit}</span>}
            {catalog.safeRange && <span className="text-secondary ms-2 small">Ref: {catalog.safeRange}</span>}
            {catalog.impressionTemplate && <span className="text-muted ms-2 small fst-italic" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>💬 {catalog.impressionTemplate}</span>}
            <span className="badge bg-secondary ms-3" style={{ fontSize: '0.7rem' }}>{catalog.services?.length || 0} sub-tests</span>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-primary fw-semibold" style={{ fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); addService(); }}>+ Add Sub-Test</button>
            <button className="btn btn-sm text-secondary p-1" onClick={(e) => { 
              e.stopPropagation(); 
              setSectionForm({ 
                section: catalog.section, 
                price: catalog.price || 0,
                unit: catalog.unit || '',
                safeRange: catalog.safeRange || '',
                impressionTemplate: catalog.impressionTemplate || ''
              }); 
              setEditingSectionId(catalog._id); 
              setShowAddSection(true); 
            }}><Edit3 size={15}/></button>
            <button className="btn btn-sm text-danger p-1" onClick={(e) => { e.stopPropagation(); handleDeleteSection(catalog._id); }}><Trash2 size={15}/></button>
          </div>
        </div>

        {expanded && (
          <div className="card-body bg-white p-3">
            {catalog.services?.length === 0 ? (
              <div className="text-center py-4 text-muted small">No tests added to this section. Click "+ Add Test" to create one.</div>
            ) : (
              catalog.services.map((svc, sIdx) => (
                <ServiceRow key={sIdx} catalogId={catalog._id} service={svc} sIndex={sIdx} updateService={updateService} deleteService={deleteService} />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-5">Loading Lab Services...</div>;

  return (
    <div className="p-4 overflow-auto flex-grow-1" style={{ backgroundColor: '#f1f5f9' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: '#0f766e' }}>Lab Catalog Manager</h5>
          <div className="text-muted small">Create main tests (sections) and define their sub-tests and parameters.</div>
        </div>
        <button className="btn fw-bold px-4 rounded-pill shadow-sm" style={{ backgroundColor: '#0d9488', color: '#fff' }} onClick={() => { setSectionForm({ section: '', price: 0, unit: '', safeRange: '' }); setEditingSectionId(null); setShowAddSection(true); }}>
          + New Main Test
        </button>
      </div>

      {showAddSection && (
        <div className="card shadow-sm mb-4 border-0" style={{ borderLeft: '4px solid #0d9488' }}>
          <div className="card-body p-3">
            <div className="row g-2 align-items-end mb-3">
              <div className="col-4">
                <label className="form-label small fw-semibold text-secondary mb-1">Main Test Name *</label>
                <input 
                  autoFocus
                  className="form-control form-control-sm" 
                  placeholder="e.g., USG, Complete Blood Count" 
                  value={sectionForm.section} 
                  onChange={e => setSectionForm({ ...sectionForm, section: e.target.value })} 
                  style={{ fontWeight: 600 }}
                />
              </div>
              <div className="col-2">
                <label className="form-label small fw-semibold text-secondary mb-1">Price (₹)</label>
                <input type="number" className="form-control form-control-sm" placeholder="0" value={sectionForm.price} onChange={e => setSectionForm({ ...sectionForm, price: e.target.valueAsNumber || 0 })} />
              </div>
              <div className="col-2">
                <label className="form-label small fw-semibold text-secondary mb-1">Unit</label>
                <input className="form-control form-control-sm" placeholder="e.g., mg/dL" value={sectionForm.unit} onChange={e => setSectionForm({ ...sectionForm, unit: e.target.value })} />
              </div>
              <div className="col-2">
                <label className="form-label small fw-semibold text-secondary mb-1">Safe Range</label>
                <input className="form-control form-control-sm" placeholder="e.g., 4-11" value={sectionForm.safeRange} onChange={e => setSectionForm({ ...sectionForm, safeRange: e.target.value })} />
              </div>
              <div className="col-12 mt-1">
                <label className="form-label small fw-semibold text-secondary mb-1">Default Impression Template <span className="text-muted fw-normal">(shown in report; editable at result-entry time)</span></label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="e.g., No abnormality detected. Liver, gallbladder, spleen, kidneys, and urinary bladder appear normal."
                  value={sectionForm.impressionTemplate}
                  onChange={e => setSectionForm({ ...sectionForm, impressionTemplate: e.target.value })}
                  style={{ resize: 'vertical', fontSize: '0.82rem' }}
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-primary px-4 fw-semibold" onClick={handleSaveSection}>Save Main Test</button>
              <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => setShowAddSection(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {catalogs.length === 0 && !showAddSection ? (
        <div className="text-center py-5">
          <div style={{ fontSize: '3rem' }}>🔬</div>
          <h6 className="fw-bold mt-3">No Lab Sections Found</h6>
          <p className="text-muted small">Click "+ New Section" to start building your dynamic lab catalog.</p>
        </div>
      ) : (
        catalogs.map(cat => <CatalogSection key={cat._id} catalog={cat} />)
      )}
    </div>
  );
};

export default LabServicesManager;
