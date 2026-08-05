import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';

const UpdateChartModal = ({ isOpen, onClose, activeTab, currentVaccines, onSaveForPatient, onSaveForAll }) => {
  if (!isOpen) return null;

  // We are only editing the templates for the currently active tab (Pediatric, Maternal, Other)
  const [templateVaccines, setTemplateVaccines] = useState(
    currentVaccines.filter(v => v.category === activeTab).map((v, i) => ({ ...v, tempId: Date.now() + i }))
  );
  
  const addVaccine = () => {
    setTemplateVaccines([
      ...templateVaccines, 
      { 
        tempId: Date.now(),
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
      }
    ]);
  };

  const removeVaccine = (tempId) => {
    setTemplateVaccines(prev => prev.filter(v => v.tempId !== tempId));
  };

  const updateVaccineField = (tempId, field, value) => {
    setTemplateVaccines(prev => prev.map(v => v.tempId === tempId ? { ...v, [field]: value } : v));
  };

  return (
    <div className="d-flex flex-column bg-white w-100 h-100">
      {/* Sub-Header */}
      <div className="d-flex justify-content-between align-items-center p-3 bg-light border-bottom">
        <div>
          <h6 className="mb-0 fw-semibold text-dark">Update {activeTab} Vaccine Template</h6>
          <span className="text-muted small">Edit the default vaccines that appear in the {activeTab.toLowerCase()} chart.</span>
        </div>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1 rounded px-3 shadow-sm" style={{ fontWeight: 500 }} onClick={addVaccine}>
          <Plus size={16} /> Add Vaccine
        </button>
      </div>

      {/* Table Area */}
      <div className="flex-grow-1 overflow-auto bg-white p-4">
        <div className="border shadow-sm mx-auto overflow-hidden rounded-3" style={{ maxWidth: '1000px' }}>
          <table className="table table-borderless table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
            <thead className="border-bottom" style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th className="fw-semibold py-3 ps-4 text-secondary" style={{ width: '25%' }}>Age</th>
                <th className="fw-semibold py-3 text-secondary" style={{ width: '40%' }}>Immunization</th>
                <th className="fw-semibold py-3 text-secondary" style={{ width: '25%' }}>Name of Vaccine</th>
                <th className="text-center py-3 text-secondary" style={{ width: '10%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {templateVaccines.map((vac) => (
                <tr key={vac.tempId} className="border-bottom" style={{ borderColor: '#f1f5f9' }}>
                  <td className="ps-4 py-2">
                    <input 
                      type="text" 
                      className="form-control form-control-sm border shadow-none px-2 py-1 text-dark bg-white" 
                      placeholder="e.g. 6 weeks" 
                      value={vac.age} 
                      onChange={e => updateVaccineField(vac.tempId, 'age', e.target.value)} 
                    />
                  </td>
                  <td className="py-2">
                    <input 
                      type="text" 
                      className="form-control form-control-sm border shadow-none px-2 py-1 text-dark bg-white" 
                      placeholder="Immunization Name" 
                      value={vac.immunization} 
                      onChange={e => updateVaccineField(vac.tempId, 'immunization', e.target.value)} 
                    />
                  </td>
                  <td className="py-2">
                    <input 
                      type="text" 
                      className="form-control form-control-sm border shadow-none px-2 py-1 text-dark bg-white" 
                      placeholder="Vaccine Name" 
                      value={vac.nameOfVaccine} 
                      onChange={e => updateVaccineField(vac.tempId, 'nameOfVaccine', e.target.value)} 
                    />
                  </td>
                  <td className="text-center py-2">
                    <button 
                      className="btn btn-sm btn-light border-0 text-danger p-2 rounded-circle d-flex align-items-center justify-content-center mx-auto hover-bg-danger-subtle" 
                      style={{ width: '32px', height: '32px' }} 
                      onClick={() => removeVaccine(vac.tempId)}
                      title="Remove Vaccine"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {templateVaccines.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted">
                    No vaccines in {activeTab.toLowerCase()} template. Click "Add Vaccine" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="d-flex justify-content-end align-items-center p-3 bg-light border-top mt-auto gap-3">
        <button className="btn btn-outline-secondary px-4 rounded" style={{ fontSize: '0.85rem', fontWeight: 500 }} onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-outline-primary px-4 rounded bg-white" style={{ fontSize: '0.85rem', fontWeight: 500 }} onClick={() => onSaveForPatient(templateVaccines)}>
          Save for This Patient
        </button>
        <button className="btn btn-primary px-4 rounded shadow-sm" style={{ fontSize: '0.85rem', fontWeight: 500 }} onClick={() => onSaveForAll(templateVaccines)}>
          Save for All
        </button>
      </div>
    </div>
  );
};

export default UpdateChartModal;
