import React, { useState, useEffect } from 'react';
import doctorService from '../../../services/doctorService';
import useWebSocket from '../../../hooks/useWebSocket';
import { Search, Plus, Trash2, ArrowUpDown, Pencil } from 'lucide-react';

const SuggestionTab = ({ type, title, placeholder = "Enter details..." }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('a-z'); 
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ text: '' });

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getClinicDirectory(type);
      setEntries(data);
    } catch (error) {
      console.error(`Error fetching ${type} directory`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [type]);

  useWebSocket({
    APPOINTMENT_UPDATED: () => {
      fetchDirectory();
    }
  });

  const openAddModal = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({ text: '' });
    setShowModal(true);
  };

  const openEditModal = (m, e) => {
    e.stopPropagation();
    setEditMode(true);
    setEditingId(m._id);
    setFormData({ text: m.text || '' });
    setShowModal(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this entry? It will not affect past prescriptions.')) return;
    try {
      await doctorService.deleteClinicDirectory(id);
      fetchDirectory();
    } catch (err) {
      console.error('Error deleting entry', err);
      alert('Failed to delete entry');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim()) {
      alert('Text is required');
      return;
    }

    const isDuplicate = entries.some(
      m => m.text.toLowerCase() === formData.text.trim().toLowerCase() && m._id !== editingId
    );
    if (isDuplicate) {
      alert('This entry is already added to the directory.');
      return;
    }

    try {
      if (editMode) {
        await doctorService.updateClinicDirectory(editingId, { type, text: formData.text });
      } else {
        await doctorService.addClinicDirectory({ type, text: formData.text });
      }
      setShowModal(false);
      fetchDirectory();
    } catch (err) {
      console.error('Error saving entry', err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to save entry');
      }
    }
  };

  let filteredEntries = entries.filter(m => {
    const term = searchTerm.toLowerCase();
    return m.text && m.text.toLowerCase().includes(term);
  });

  filteredEntries.sort((a, b) => {
    if (sortOption === 'a-z') return (a.text || '').localeCompare(b.text || '');
    if (sortOption === 'z-a') return (b.text || '').localeCompare(a.text || '');
    if (sortOption === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortOption === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return 0;
  });

  return (
    <div className="p-4 h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-3">
        <h5 className="fw-bold mb-0">{title} Directory</h5>
        
        <div className="d-flex gap-2 ms-auto flex-wrap">
          <div className="input-group" style={{ width: '250px' }}>
            <span className="input-group-text bg-white text-muted border-end-0">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0 shadow-none" 
              placeholder="Search..."
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
            <Plus size={16} /> Add New
          </button>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto bg-white rounded border shadow-sm">
        {loading ? (
          <div className="p-5 text-center text-muted">Loading {title.toLowerCase()}...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-5 text-center text-muted">No {title.toLowerCase()} found.</div>
        ) : (
          <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light sticky-top">
              <tr>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem', width: '80px' }}>#</th>
                <th className="py-3 px-3 border-bottom text-uppercase text-secondary fw-bold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>{title} Details</th>
                <th className="py-3 px-3 border-bottom text-end" style={{ width: '120px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((m, index) => (
                <tr key={m._id || index}>
                  <td className="align-middle px-3 text-muted">{index + 1}</td>
                  <td className="align-middle px-3 fw-medium text-dark">{m.text}</td>
                  <td className="align-middle px-3 text-end" style={{ whiteSpace: 'nowrap' }}>
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        className="btn btn-sm btn-light text-primary border shadow-sm p-1" 
                        onClick={(e) => openEditModal(m, e)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-light text-danger border shadow-sm p-1" 
                        onClick={(e) => handleDelete(m._id, e)}
                        title="Delete"
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

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-bottom-0 py-3">
                <h5 className="modal-title fw-bold">{editMode ? `Edit ${title}` : `Add ${title}`}</h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body p-4 bg-white">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">{title} <span className="text-danger">*</span></label>
                    <input 
                      required
                      autoFocus
                      className="form-control"
                      placeholder={placeholder}
                      value={formData.text}
                      onChange={e => setFormData({ text: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light border-top-0 py-3">
                  <button type="button" className="btn btn-light border px-4 fw-medium shadow-sm" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2">
                    {editMode ? <Pencil size={16} /> : <Plus size={16} />} 
                    {editMode ? 'Update' : 'Save'}
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

export default SuggestionTab;
