import React, { useState, useEffect } from 'react';
import { Search, Trash2 } from 'lucide-react';
import serviceApi from '../../../services/serviceApi';

const ServicesTab = () => {
  const [services, setServices] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newType, setNewType] = useState('Consultation');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await serviceApi.getServices();
      setServices(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newName) return;
    try {
      await serviceApi.createService({ 
        serviceName: newName.toUpperCase(), 
        type: newType,
        price: Number(newPrice) || 0
      });
      setNewName('');
      setNewPrice(0);
      setNewType('Consultation');
      setIsAdding(false);
      fetchServices();
    } catch (e) {
      console.error(e);
      alert('Error creating service');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Service?")) return;
    try {
      await serviceApi.deleteService(id);
      fetchServices();
    } catch (e) {
      console.error(e);
      alert('Error deleting service');
    }
  };

  const filteredServices = services.filter(s => {
    if (!searchQuery) return true;
    return s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.type?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-3 bg-white h-100">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control form-control-sm bg-light border-0 ps-3" 
              placeholder="Search Services" 
              style={{ width: '200px' }} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="position-absolute top-50 translate-middle-y end-0 me-2 text-primary" />
          </div>
          <button className="btn btn-primary btn-sm px-3 fw-bold" onClick={() => setIsAdding(!isAdding)}>+ ADD NEW</button>
        </div>
        <span className="text-muted small">1 - {filteredServices.length} of {services.length} &lt; &gt;</span>
      </div>

      <table className="table table-borderless table-striped align-middle border">
        <thead className="bg-light border-bottom text-muted small">
          <tr>
            <th>Service Name</th>
            <th>Type</th>
            <th>Price</th>
            <th className="text-end pe-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr>
              <td><input type="text" className="form-control form-control-sm" placeholder="Service Name (e.g. CONSULTATION)" value={newName} onChange={e => setNewName(e.target.value)} /></td>
              <td>
                <select className="form-select form-select-sm" value={newType} onChange={e => setNewType(e.target.value)}>
                  <option value="Consultation">Consultation</option>
                  <option value="Lab">Lab</option>
                  <option value="Day Care">Day Care</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Other">Other</option>
                </select>
              </td>
              <td><input type="number" className="form-control form-control-sm" placeholder="Price" value={newPrice} onChange={e => setNewPrice(e.target.value)} /></td>
              <td className="text-end pe-4">
                <button className="btn btn-sm btn-success me-2" onClick={handleAdd}>Save</button>
                <button className="btn btn-sm btn-light" onClick={() => setIsAdding(false)}>Cancel</button>
              </td>
            </tr>
          )}
          {filteredServices.map(s => {
            const isActive = s.isActive !== false;
            return (
              <tr key={s._id}>
                <td className="fw-semibold text-dark small py-3">
                  <span style={{ textDecoration: !isActive ? 'line-through' : 'none', color: !isActive ? '#9ca3af' : 'inherit' }}>
                    {s.serviceName}
                  </span>
                  {!isActive && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>Disabled</span>}
                </td>
                <td className="text-muted small py-3">{s.type}</td>
                <td className="text-muted small py-3">₹{s.price}</td>
                <td className="text-end pe-4 text-muted py-3">
                  <div className="d-flex justify-content-end gap-3 align-items-center">
                    <div className="form-check form-switch mb-0" title={isActive ? "Disable Service" : "Enable Service"}>
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch"
                        checked={isActive}
                        onChange={async () => {
                          try {
                            await serviceApi.updateService(s._id, { isActive: !isActive });
                            fetchServices();
                          } catch(e) {
                            alert("Failed to change status");
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => handleDelete(s._id)} title="Delete Service" />
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredServices.length === 0 && !isAdding && (
            <tr>
              <td colSpan="4" className="text-center text-muted py-4">No services found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ServicesTab;
