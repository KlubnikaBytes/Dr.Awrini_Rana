import React, { useState, useEffect } from 'react';
import doctorService from '../../../services/doctorService';
import useWebSocket from '../../../hooks/useWebSocket';
import { Search, Plus, Trash2, ArrowUpDown, Pencil } from 'lucide-react';

const MedicineTab = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('a-z'); // a-z, z-a, newest, oldest
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: '', medicineName: '', genericName: '', dosage: '', when: '', frequency: '', duration: '', notes: ''
  });

  const fetchMedicines = async () => {
    try {
      const data = await doctorService.getAllMedicines();
      setMedicines(data);
    } catch (error) {
      console.error('Error fetching medicines', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useWebSocket({
    APPOINTMENT_UPDATED: () => {
      fetchMedicines();
    }
  });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this medicine? It will not affect past prescriptions.')) return;
    try {
      await doctorService.deleteMedicine(id);
      fetchMedicines();
    } catch (err) {
      console.error('Error deleting medicine', err);
      alert('Failed to delete medicine');
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({ type: '', medicineName: '', genericName: '', dosage: '', when: '', frequency: '', duration: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (m, e) => {
    e.stopPropagation();
    setEditMode(true);
    setEditingId(m._id);
    setFormData({
      type: m.type || '',
      medicineName: m.medicineName || '',
      genericName: m.genericName || '',
      dosage: m.dosage || '',
      when: m.when || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      notes: m.notes || ''
    });
    setShowModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicineName.trim()) {
      alert('Medicine name is required');
      return;
    }

    // Client side duplicate check (optional, backend also enforces it)
    const isDuplicate = medicines.some(
      m => m.medicineName.toLowerCase() === formData.medicineName.trim().toLowerCase() && m._id !== editingId
    );
    if (isDuplicate) {
      alert('This medicine is already added to the directory.');
      return;
    }

    try {
      if (editMode) {
        await doctorService.updateMedicine(editingId, formData);
      } else {
        await doctorService.addMedicine(formData);
      }
      setShowModal(false);
      fetchMedicines();
    } catch (err) {
      console.error('Error saving medicine', err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to save medicine');
      }
    }
  };

  let filteredMedicines = medicines.filter(m => {
    const term = searchTerm.toLowerCase();
    return (
      (m.medicineName && m.medicineName.toLowerCase().includes(term)) ||
      (m.genericName && m.genericName.toLowerCase().includes(term)) ||
      (m.dosage && m.dosage.toLowerCase().includes(term))
    );
  });

  // Sorting
  filteredMedicines.sort((a, b) => {
    if (sortOption === 'a-z') return (a.medicineName || '').localeCompare(b.medicineName || '');
    if (sortOption === 'z-a') return (b.medicineName || '').localeCompare(a.medicineName || '');
    if (sortOption === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortOption === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return 0;
  });

  // Unique lists for datalists
  const uniqueTypes = [...new Set(medicines.map(m => m.type).filter(Boolean))];
  const uniqueDosages = [...new Set(medicines.map(m => m.dosage).filter(Boolean))];
  const uniqueWhens = [...new Set(medicines.map(m => m.when).filter(Boolean))];
  const uniqueFrequencies = [...new Set(medicines.map(m => m.frequency).filter(Boolean))];
  const uniqueDurations = [...new Set(medicines.map(m => m.duration).filter(Boolean))];

  return (
    <div className="p-4 h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-3">
        <h5 className="fw-bold mb-0">Medicines Directory</h5>
        
        <div className="d-flex gap-2 ms-auto flex-wrap">
          <div className="input-group" style={{ width: '250px' }}>
            <span className="input-group-text bg-white text-muted border-end-0">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0 shadow-none" 
              placeholder="Search medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ width: '180px' }}>
            <span className="input-group-text bg-white text-muted border-end-0">
              <ArrowUpDown size={16} />
            </span>
            <select 
              className="form-select border-start-0 ps-0 shadow-none" 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="a-z">A - Z</option>
              <option value="z-a">Z - A</option>
              <option value="newest">Last Added</option>
              <option value="oldest">First Added</option>
            </select>
          </div>

          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openAddModal}>
            <Plus size={16} /> Add Medicine
          </button>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto bg-white rounded border shadow-sm">
        {loading ? (
          <div className="p-5 text-center text-muted">Loading medicines...</div>
        ) : filteredMedicines.length === 0 ? (
          <div className="p-5 text-center text-muted">No medicines found.</div>
        ) : (
          <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light sticky-top">
              <tr>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>#</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Type</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Medicine</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Generic Name</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Dosage</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>When</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Frequency</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Duration</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Notes</th>
                <th className="py-3 px-3 border-bottom text-end"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.map((m, index) => (
                <tr key={m._id || index}>
                  <td className="align-middle px-3 text-muted">{index + 1}</td>
                  <td className="align-middle px-3">{m.type || '-'}</td>
                  <td className="align-middle px-3 fw-medium text-dark">{m.medicineName}</td>
                  <td className="align-middle px-3 text-muted">{m.genericName || '-'}</td>
                  <td className="align-middle px-3">{m.dosage || '-'}</td>
                  <td className="align-middle px-3 text-muted">{m.when || '-'}</td>
                  <td className="align-middle px-3 text-muted">{m.frequency || '-'}</td>
                  <td className="align-middle px-3 text-muted">{m.duration || '-'}</td>
                  <td className="align-middle px-3 text-muted" style={{ maxWidth: '150px' }}>
                    <div className="text-truncate" title={m.notes}>{m.notes || '-'}</div>
                  </td>
                  <td className="align-middle px-3 text-end" style={{ whiteSpace: 'nowrap' }}>
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        className="btn btn-sm btn-light text-primary border shadow-sm p-1" 
                        onClick={(e) => openEditModal(m, e)}
                        title="Edit Medicine"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-light text-danger border shadow-sm p-1" 
                        onClick={(e) => handleDelete(m._id, e)}
                        title="Delete Medicine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Medicine Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-bottom-0 py-3">
                <h5 className="modal-title fw-bold">{editMode ? 'Edit Medicine' : 'Add Medicine'}</h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body p-4 bg-white">
                  
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Type</label>
                      <input 
                        list="medicineTypes"
                        className="form-control form-control-sm"
                        placeholder="e.g. TAB."
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                      />
                      <datalist id="medicineTypes">
                        {uniqueTypes.map((t, i) => <option key={i} value={t} />)}
                      </datalist>
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-bold text-muted">Medicine Name <span className="text-danger">*</span></label>
                      <input 
                        required
                        className="form-control form-control-sm"
                        placeholder="e.g. PARACETAMOL 500"
                        value={formData.medicineName}
                        onChange={e => setFormData({...formData, medicineName: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-muted">Generic Name</label>
                      <input 
                        className="form-control form-control-sm"
                        placeholder="Generic components..."
                        value={formData.genericName}
                        onChange={e => setFormData({...formData, genericName: e.target.value})}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Dosage</label>
                      <input 
                        list="medicineDosages"
                        className="form-control form-control-sm"
                        placeholder="e.g. 1-0-1"
                        value={formData.dosage}
                        onChange={e => setFormData({...formData, dosage: e.target.value})}
                      />
                      <datalist id="medicineDosages">
                        {uniqueDosages.map((t, i) => <option key={i} value={t} />)}
                      </datalist>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">When</label>
                      <input 
                        list="medicineWhens"
                        className="form-control form-control-sm"
                        placeholder="e.g. After Food"
                        value={formData.when}
                        onChange={e => setFormData({...formData, when: e.target.value})}
                      />
                      <datalist id="medicineWhens">
                        {uniqueWhens.map((t, i) => <option key={i} value={t} />)}
                      </datalist>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Frequency</label>
                      <input 
                        list="medicineFrequencies"
                        className="form-control form-control-sm"
                        placeholder="e.g. daily"
                        value={formData.frequency}
                        onChange={e => setFormData({...formData, frequency: e.target.value})}
                      />
                      <datalist id="medicineFrequencies">
                        {uniqueFrequencies.map((t, i) => <option key={i} value={t} />)}
                      </datalist>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Duration</label>
                      <input 
                        list="medicineDurations"
                        className="form-control form-control-sm"
                        placeholder="e.g. 5 Days"
                        value={formData.duration}
                        onChange={e => setFormData({...formData, duration: e.target.value})}
                      />
                      <datalist id="medicineDurations">
                        {uniqueDurations.map((t, i) => <option key={i} value={t} />)}
                      </datalist>
                    </div>

                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">Notes / Instructions</label>
                      <input 
                        className="form-control form-control-sm"
                        placeholder="Any additional notes..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>
                  </div>

                </div>
                <div className="modal-footer bg-light border-top-0 py-3">
                  <button type="button" className="btn btn-light border px-4 fw-medium shadow-sm" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2">
                    {editMode ? <Pencil size={16} /> : <Plus size={16} />} 
                    {editMode ? 'Update Medicine' : 'Save Medicine'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineTab;
