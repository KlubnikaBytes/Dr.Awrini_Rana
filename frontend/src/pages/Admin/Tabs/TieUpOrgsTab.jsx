import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';
import adminService from '../../../services/adminService';

const TieUpOrgsTab = () => {
  const [orgs, setOrgs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const data = await adminService.getTieUpOrgs();
      setOrgs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newName) return;
    try {
      await adminService.addTieUpOrg({ name: newName });
      setNewName('');
      setIsAdding(false);
      fetchOrgs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Tie-Up Organization?")) return;
    try {
      await adminService.deleteTieUpOrg(id);
      fetchOrgs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-3 bg-white h-100">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            <input type="text" className="form-control form-control-sm bg-light border-0 ps-3" placeholder="Search" style={{ width: '200px' }} />
            <Search size={14} className="position-absolute top-50 translate-middle-y end-0 me-2 text-primary" />
          </div>
          <button className="btn btn-primary btn-sm px-3 fw-bold" onClick={() => setIsAdding(!isAdding)}>+ ADD NEW</button>
        </div>
        <span className="text-muted small">1 - {orgs.length} of {orgs.length} &lt; &gt;</span>
      </div>

      <table className="table table-borderless table-striped align-middle border">
        <thead className="bg-light border-bottom text-muted small">
          <tr>
            <th>Organization Name</th>
            <th className="text-end pe-4">Edit</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr>
              <td><input type="text" className="form-control form-control-sm" placeholder="Organization Name" value={newName} onChange={e => setNewName(e.target.value)} /></td>
              <td className="text-end pe-4">
                <button className="btn btn-sm btn-success me-2" onClick={handleAdd}>Save</button>
                <button className="btn btn-sm btn-light" onClick={() => setIsAdding(false)}>Cancel</button>
              </td>
            </tr>
          )}
          {orgs.map(o => (
            <tr key={o._id}>
              <td className="fw-semibold text-dark small py-3">{o.name.toUpperCase()}</td>
              <td className="text-end pe-4 text-muted py-3">
                <Trash2 size={16} style={{ cursor: 'pointer' }} onClick={() => handleDelete(o._id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TieUpOrgsTab;
