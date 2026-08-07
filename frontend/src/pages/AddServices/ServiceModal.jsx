import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import serviceApi from '../../services/serviceApi';

const ServiceModal = ({ service, type, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: service || {
      type: type,
      code: '',
      serviceId: '',
      serviceName: '',
      price: 0,
      gst: 0,
      priority: '1',
      serviceOwner: 'Dr Aswini Rana'
    }
  });

  const onSubmit = async (data) => {
    try {
      if (service) {
        await serviceApi.updateService(service._id, data);
      } else {
        await serviceApi.createService(data);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save service');
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSubmit(onSubmit)}>
            
            <div className="modal-header">
              <h5 className="modal-title">{service ? 'Edit' : 'Add'} {type} Service</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">CODE</label>
                <input type="text" className="form-control" {...register('code')} />
              </div>

              {type === 'Appointment' && (
                <div className="mb-3">
                  <label className="form-label">Service ID</label>
                  <input type="text" className="form-control" {...register('serviceId')} />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Service Name</label>
                <input type="text" className="form-control" {...register('serviceName', { required: true })} />
                {errors.serviceName && <span className="text-danger small">Required</span>}
              </div>

              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label">Price</label>
                  <input type="number" className="form-control" {...register('price', { valueAsNumber: true })} />
                </div>
                <div className="col-6">
                  <label className="form-label">GST (%)</label>
                  <input type="number" className="form-control" {...register('gst', { valueAsNumber: true })} />
                </div>
              </div>

              {type === 'Appointment' && (
                <div className="mb-3">
                  <label className="form-label">Priority</label>
                  <select className="form-select" {...register('priority')}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Service Owner</label>
                <input type="text" className="form-control" {...register('serviceOwner')} />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
