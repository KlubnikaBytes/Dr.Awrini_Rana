import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';
import adminService from '../../../services/adminService';

const VendorsTab = () => {
  const [vendors, setVendors] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const data = await adminService.getVendors();
      setVendors(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newName || !newPhone) return;
    try {
      await adminService.addVendor({ name: newName, phone: newPhone });
      setNewName('');
      setNewPhone('');
      setIsAdding(false);
      fetchVendors();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminService.deleteVendor(id);
      fetchVendors();
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
        <span className="text-muted small">1 - {vendors.length} of {vendors.length} &lt; &gt;</span>
      </div>

      <table className="table table-borderless table-striped align-middle border">
        <thead className="bg-light border-bottom text-muted small">
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th className="text-end pe-4">Edit</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr>
              <td><input type="text" className="form-control form-control-sm" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} /></td>
              <td><input type="text" className="form-control form-control-sm" placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} /></td>
              <td className="text-end pe-4">
                <button className="btn btn-sm btn-success me-2" onClick={handleAdd}>Save</button>
                <button className="btn btn-sm btn-light" onClick={() => setIsAdding(false)}>Cancel</button>
              </td>
            </tr>
          )}
          {vendors.map(v => (
            <tr key={v._id}>
              <td className="fw-semibold text-dark small py-3">{v.name.toUpperCase()}</td>
              <td className="text-muted small py-3">{v.phone}</td>
              <td className="text-end pe-4 text-muted py-3">
                <Edit2 size={16} className="me-3" style={{ cursor: 'pointer' }} />
                <Trash2 size={16} style={{ cursor: 'pointer' }} onClick={() => handleDelete(v._id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VendorsTab;
