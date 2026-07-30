import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';

const VitalsModal = ({ appointment, onClose, onSuccess }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: appointment?.vitals || {}
  });

  const onSubmit = async (data) => {
    try {
      await frontdeskService.updateVitals(appointment._id, data);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Error saving vitals');
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Vitals for {appointment.patient?.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="row g-4">
                <div className="col-md-4">
                  <label className="form-label mb-1">BP(mmHg)</label>
                  <div className="d-flex align-items-center gap-2">
                    <input type="text" className="form-control" {...register('bpSystolic')} />
                    <span className="fw-bold fs-5">/</span>
                    <input type="text" className="form-control" {...register('bpDiastolic')} />
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Pulse(bpm)</label>
                  <input type="text" className="form-control" {...register('pulse')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Height(cm)</label>
                  <input type="text" className="form-control" {...register('height')} />
                </div>
                
                <div className="col-md-4 mt-3">
                  <label className="form-label mb-1">Weight(kg)</label>
                  <input type="text" className="form-control" {...register('weight')} />
                </div>
                <div className="col-md-4 mt-3">
                  <label className="form-label mb-1">Temperature(F)</label>
                  <input type="text" className="form-control" {...register('temperature')} />
                </div>
                <div className="col-md-4 mt-3">
                  <label className="form-label mb-1">SPO2(%)</label>
                  <input type="text" className="form-control" {...register('spo2')} />
                </div>
              </div>

              <div className="text-end mt-5">
                <button type="submit" className="btn btn-primary px-4">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VitalsModal;
