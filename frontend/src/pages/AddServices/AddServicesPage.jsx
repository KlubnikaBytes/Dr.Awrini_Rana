import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import serviceApi from '../../services/serviceApi';
import ServiceModal from './ServiceModal';

const CATEGORIES = ['Consultation', 'Lab', 'Day Care', 'Home Care', 'Other'];

const AddServicesPage = () => {
  const [activeTab, setActiveTab] = useState('Consultation');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await serviceApi.getServices();
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceApi.deleteService(id);
        fetchServices();
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

  const filteredServices = services.filter(s => s.type === activeTab);

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* Tabs Header */}
      <div className="d-flex border-bottom ps-3 pt-2" style={{ backgroundColor: '#f8f9fa', overflowX: 'auto' }}>
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

      <div className="p-3 bg-light border-bottom text-end">
        <button className="btn btn-primary" onClick={openNewModal}>
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

      {isModalOpen && (
        <ServiceModal 
          service={editingService} 
          type={activeTab}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchServices();
          }}
        />
      )}

    </div>
  );
};

export default AddServicesPage;
