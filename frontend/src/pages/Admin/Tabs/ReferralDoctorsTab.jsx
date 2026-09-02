import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';
import adminService from '../../../services/adminService';

const ReferralDoctorsTab = () => {
  const [docs, setDocs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [activeTab, setActiveTab] = useState('BY');

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

  const handleDelete = async (id) => {
    try {
      await adminService.deleteReferralDoctor(id);
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-3 bg-white h-100">
      {/* Top Bar */}
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
            <tr key={doc._id}>
              <td className="fw-semibold text-dark small py-3">{doc.name.toUpperCase()}</td>
              <td className="text-muted small py-3">{doc.specialization.toUpperCase()}</td>
              <td className="text-end pe-4 text-muted py-3">
                <Edit2 size={16} className="me-3" style={{ cursor: 'pointer' }} />
                <Trash2 size={16} style={{ cursor: 'pointer' }} onClick={() => handleDelete(doc._id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReferralDoctorsTab;
