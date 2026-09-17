import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Users, BarChart2 } from 'lucide-react';
import adminService from '../../../services/adminService';
import ReferralAnalytics from '../../../components/Admin/ReferralAnalytics';

const ReferralDoctorsTab = () => {
  const [viewMode, setViewMode] = useState('MANAGE'); // 'MANAGE' or 'ANALYTICS'
  const [docs, setDocs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [activeTab, setActiveTab] = useState('BY');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSpec, setEditSpec] = useState('');

  const [pendingDeletes, setPendingDeletes] = useState({});
  const deleteTimeouts = React.useRef({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(deleteTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const data = await adminService.getReferralDoctors();
      setDocs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newName || !newSpec) return;
    try {
      await adminService.addReferralDoctor({ name: newName, specialization: newSpec, type: activeTab });
      setNewName('');
      setNewSpec('');
      setIsAdding(false);
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id, docName) => {
    setPendingDeletes(prev => ({ ...prev, [id]: true }));
    const timeoutId = setTimeout(async () => {
      try {
        await adminService.deleteReferralDoctor(id);
        setPendingDeletes(prev => { const next = { ...prev }; delete next[id]; return next; });
        fetchDocs();
      } catch (e) {
        console.error(e);
        alert('Delete failed');
        setPendingDeletes(prev => { const next = { ...prev }; delete next[id]; return next; });
      }
    }, 5000);
    deleteTimeouts.current[id] = timeoutId;
  };

  const handleUndo = (id) => {
    clearTimeout(deleteTimeouts.current[id]);
    delete deleteTimeouts.current[id];
    setPendingDeletes(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleEdit = (doc) => {
    setEditingId(doc._id);
    setEditName(doc.name);
    setEditSpec(doc.specialization);
  };

  const handleUpdate = async (id) => {
    if (!editName || !editSpec) return;
    try {
      await adminService.updateReferralDoctor(id, { name: editName, specialization: editSpec, type: activeTab });
      setEditingId(null);
      fetchDocs();
    } catch (e) {
      console.error(e);
      alert('Update failed');
    }
  };

  return (
    <div className="p-3 bg-white h-100 d-flex flex-column">
      {/* Top Level View Toggle */}
      <div className="d-flex mb-4">
        <div className="btn-group shadow-sm" role="group">
          <button 
            type="button" 
            className={`btn btn-sm px-4 fw-bold d-flex align-items-center gap-2 ${viewMode === 'MANAGE' ? 'btn-primary' : 'btn-outline-primary bg-white'}`}
            onClick={() => setViewMode('MANAGE')}
          >
            <Users size={16} /> Manage Doctors
          </button>
          <button 
            type="button" 
            className={`btn btn-sm px-4 fw-bold d-flex align-items-center gap-2 ${viewMode === 'ANALYTICS' ? 'btn-primary' : 'btn-outline-primary bg-white'}`}
            onClick={() => setViewMode('ANALYTICS')}
          >
            <BarChart2 size={16} /> Analytics & Reports
          </button>
        </div>
      </div>

      {viewMode === 'ANALYTICS' ? (
        <div className="flex-grow-1 overflow-auto">
          <ReferralAnalytics />
        </div>
      ) : (
        <div className="flex-grow-1 overflow-auto">
          {/* Top Bar for Manage */}
          <div className="d-flex align-items-center mb-3">
             <div className="d-flex border-bottom me-4">
               <span className={`hp-inner-tab ${activeTab === 'BY' ? 'active border-primary text-primary' : ''}`} style={{ borderBottomWidth: activeTab === 'BY' ? '2px' : '0', cursor: 'pointer' }} onClick={() => setActiveTab('BY')}>Referred by</span>
               <span className={`hp-inner-tab ${activeTab === 'TO' ? 'active border-primary text-primary' : ''}`} style={{ borderBottomWidth: activeTab === 'TO' ? '2px' : '0', cursor: 'pointer' }} onClick={() => setActiveTab('TO')}>Referred to</span>
             </div>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative">
                <input type="text" className="form-control form-control-sm bg-light border-0 ps-3" placeholder="Search" style={{ width: '200px' }} />
                <Search size={14} className="position-absolute top-50 translate-middle-y end-0 me-2 text-primary" />
              </div>
              <button className="btn btn-primary btn-sm px-3 fw-bold" onClick={() => setIsAdding(!isAdding)}>+ ADD NEW</button>
            </div>
            <span className="text-muted small">1 - {docs.filter(d => d.type === activeTab || (!d.type && activeTab === 'BY')).length} of {docs.filter(d => d.type === activeTab || (!d.type && activeTab === 'BY')).length} &lt; &gt;</span>
          </div>

          <table className="table table-borderless table-striped align-middle border">
            <thead className="bg-light border-bottom text-muted small">
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr>
                  <td><input type="text" className="form-control form-control-sm" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} /></td>
                  <td><input type="text" className="form-control form-control-sm" placeholder="Specialization" value={newSpec} onChange={e => setNewSpec(e.target.value)} /></td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-success me-2" onClick={handleAdd}>Save</button>
                    <button className="btn btn-sm btn-light" onClick={() => setIsAdding(false)}>Cancel</button>
                  </td>
                </tr>
              )}
              {docs.filter(d => d.type === activeTab || (!d.type && activeTab === 'BY')).map(doc => (
                pendingDeletes[doc._id] ? (
                  <tr key={doc._id} style={{ backgroundColor: '#fff5f5' }}>
                    <td colSpan={2} className="text-danger small fw-bold py-3">
                      {doc.name.toUpperCase()} will be deleted in a few seconds...
                    </td>
                    <td className="text-end pe-4 py-3">
                      <button className="btn btn-sm btn-outline-danger fw-bold" onClick={() => handleUndo(doc._id)}>Undo</button>
                    </td>
                  </tr>
                ) : editingId === doc._id ? (
                  <tr key={doc._id}>
                    <td><input type="text" className="form-control form-control-sm" value={editName} onChange={e => setEditName(e.target.value)} /></td>
                    <td><input type="text" className="form-control form-control-sm" value={editSpec} onChange={e => setEditSpec(e.target.value)} /></td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-success me-2" onClick={() => handleUpdate(doc._id)}>Save</button>
                      <button className="btn btn-sm btn-light" onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={doc._id}>
                    <td className="fw-semibold text-dark small py-3">{doc.name.toUpperCase()}</td>
                    <td className="text-muted small py-3">{doc.specialization.toUpperCase()}</td>
                    <td className="text-end pe-4 text-muted py-3">
                      <Edit2 size={16} className="me-3" style={{ cursor: 'pointer' }} onClick={() => handleEdit(doc)} />
                      <Trash2 size={16} style={{ cursor: 'pointer', color: '#dc3545' }} onClick={() => handleDelete(doc._id, doc.name)} />
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReferralDoctorsTab;
