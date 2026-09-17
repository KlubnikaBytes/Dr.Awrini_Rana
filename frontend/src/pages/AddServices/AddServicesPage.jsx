import React, { useState, useEffect } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import serviceApi from '../../services/serviceApi';
import labCatalogService from '../../services/labCatalogService';
import ServiceModal from './ServiceModal';
import LabServicesManager from './LabServicesManager';

const CATEGORIES = ['Consultation', 'Lab', 'Day Care', 'Home Care', 'Other'];

const AddServicesPage = () => {
  const [activeTab, setActiveTab] = useState('Consultation');
  const [services, setServices] = useState([]);
  const [labCatalogs, setLabCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Universal search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);

  useEffect(() => {
    fetchServicesAndCatalogs();
  }, []);

  const fetchServicesAndCatalogs = async () => {
    try {
      setLoading(true);
      const [servicesData, labData] = await Promise.all([
        serviceApi.getServices(),
        labCatalogService.getCatalogs()
      ]);
      setServices(servicesData || []);
      setLabCatalogs(labData || []);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceApi.deleteService(id);
        fetchServicesAndCatalogs();
      } catch (error) {
        console.error('Error deleting service', error);
      }
    }
  };

  const openNewModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(s => {
    if (s.isActive === false) return false;
    if (s.type !== activeTab) return false;
    if (globalSearchQuery && activeTab !== 'Lab') {
      return (s.serviceName && s.serviceName.toLowerCase().includes(globalSearchQuery.toLowerCase())) || 
             (s.code && s.code.toLowerCase().includes(globalSearchQuery.toLowerCase()));
    }
    return true;
  });

  // Build universal dropdown options
  const universalOptions = [];
  if (globalSearchQuery) {
    const q = globalSearchQuery.toLowerCase();
    services.forEach(s => {
      if (s.isActive === false) return;
      if ((s.serviceName && s.serviceName.toLowerCase().includes(q)) || (s.code && s.code.toLowerCase().includes(q))) {
        universalOptions.push({ name: s.serviceName, type: s.type, id: s._id, code: s.code });
      }
    });
    labCatalogs.forEach(cat => {
      if (cat.section?.toLowerCase().includes(q)) {
        universalOptions.push({ name: cat.section, type: 'Lab', id: cat._id, subType: 'Main Test' });
      }
      cat.services?.forEach(s => {
        if (s.name?.toLowerCase().includes(q)) {
          universalOptions.push({ name: s.name, type: 'Lab', id: s.name + cat._id, subType: `Sub-test in ${cat.section}` });
        }
      });
    });
  }

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* Tabs Header with Universal Search */}
      <div className="d-flex border-bottom ps-3 pt-2 align-items-end justify-content-between flex-wrap gap-2" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="d-flex" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {CATEGORIES.map(category => (
            <button 
              key={category}
              className={`btn border-0 rounded-0 px-4 py-2 ${activeTab === category ? 'bg-white fw-bold border-top border-end border-start' : 'text-muted'}`}
              style={activeTab === category ? { borderTopColor: '#2dd4bf', borderTopWidth: '3px', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' }}
              onClick={() => setActiveTab(category)}
            >
              {category} Services
            </button>
          ))}
        </div>
        
        <div className="pe-3 pb-2 position-relative" style={{ width: '350px' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <Search size={16} className="text-muted" />
            </span>
            <input 
              type="text" 
              className={`form-control border-start-0 ps-0 fw-semibold ${globalSearchQuery ? 'border-end-0' : ''}`} 
              placeholder="Search ALL services & lab tests..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setShowGlobalDropdown(true);
              }}
              onFocus={() => setShowGlobalDropdown(true)}
              onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 200)}
            />
            {globalSearchQuery && (
              <span 
                className="input-group-text bg-white border-start-0" 
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setGlobalSearchQuery('');
                  setShowGlobalDropdown(false);
                }}
              >
                <X size={16} className="text-muted" />
              </span>
            )}
          </div>
          
          {showGlobalDropdown && globalSearchQuery && universalOptions.length > 0 && (
            <div className="dropdown-menu show w-100 position-absolute shadow-sm border-0 mt-1" style={{ top: '100%', right: 0, zIndex: 1050, maxHeight: '300px', overflowY: 'auto' }}>
              {universalOptions.map((opt, i) => (
                <button 
                  key={i}
                  className="dropdown-item py-2 d-flex justify-content-between align-items-center" 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input onBlur from firing first
                    setActiveTab(opt.type);
                    setGlobalSearchQuery(opt.name);
                    setShowGlobalDropdown(false);
                  }}
                >
                  <div className="d-flex flex-column text-truncate pe-2">
                    <span className="fw-semibold text-truncate">{opt.name}</span>
                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>{opt.subType || `Code: ${opt.code || 'N/A'}`}</span>
                  </div>
                  <span className="badge bg-light text-secondary border">{opt.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'Lab' ? (
        <LabServicesManager externalSearchQuery={globalSearchQuery} onClearSearch={() => setGlobalSearchQuery('')} />
      ) : (
        <>
          <div className="p-3 bg-light border-bottom text-end">
            <button className="btn btn-primary shadow-sm" onClick={openNewModal}>
              + New {activeTab} Service
            </button>
          </div>

          <div className="flex-grow-1 p-3 overflow-auto table-responsive">
            {loading ? (
              <div className="text-center py-5">Loading...</div>
            ) : (
              <table className="table table-bordered align-middle table-hover mb-0" style={{ minWidth: '800px' }}>
                <thead className="table-light">
                  <tr>
                    <th>CODE</th>
                    {activeTab === 'Consultation' && <th>Service ID</th>}
                    <th>Service Name</th>
                    <th>Price</th>
                    <th>GST (%)</th>
                    {activeTab === 'Consultation' && <th>Priority</th>}
                    <th>Service Owner</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map(service => (
                    <tr key={service._id}>
                      <td>{service.code}</td>
                      {activeTab === 'Consultation' && <td>{service.serviceId}</td>}
                      <td>{service.serviceName}</td>
                      <td>{service.price}</td>
                      <td>{service.gst}</td>
                      {activeTab === 'Consultation' && <td>{service.priority}</td>}
                      <td>{service.serviceOwner}</td>
                      <td>
                        <button className="btn btn-link text-primary p-0" onClick={() => openEditModal(service)}>Edit</button>
                      </td>
                      <td>
                        <button className="btn btn-link text-primary p-0" onClick={() => handleDelete(service._id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'Consultation' ? 9 : 7} className="text-center text-muted py-4">
                        No services found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {isModalOpen && (
        <ServiceModal 
          service={editingService} 
          type={activeTab}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchServicesAndCatalogs();
          }}
        />
      )}

    </div>
  );
};

export default AddServicesPage;
