import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';

const NewAppointmentModal = ({ onClose, onSuccess }) => {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      status: 'BOOKED',
      duration: '5 mins',
      date: new Date().toISOString().split('T')[0],
      qty: 1,
      discount: 0,
      tax: 0
    }
  });

  const skipBilling = watch('skipBilling');
  const unitPrice = watch('unitPrice') || 0;
  const qty = watch('qty') || 1;
  const discount = watch('discount') || 0;
  const netPrice = (unitPrice * qty) - discount;

  const onSubmit = async (data) => {
    try {
      const payload = {
        patientName: data.patientName,
        doctorName: data.doctorName,
        service: data.service,
        status: data.status,
        time: data.time,
        duration: data.duration,
        date: data.date,
        skipBilling: data.skipBilling,
        billingDetails: {
          unitPrice: Number(data.unitPrice),
          qty: Number(data.qty),
          discount: Number(data.discount),
          tax: Number(data.tax),
          netPrice: Number(netPrice)
        }
      };
      
      await frontdeskService.createAppointment(payload);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Error creating appointment');
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">New Appointment</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="row g-4">
                {/* Left Column */}
                <div className="col-md-6">
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Patient</label>
                    <input type="text" className="form-control bg-light" placeholder="Patient Name" {...register('patientName', { required: true })} />
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Doctor</label>
                    <select className="form-select" {...register('doctorName', { required: true })}>
                      <option value="">Select Doctor</option>
                      <option value="Dr Aswini Rana">Dr Aswini Rana</option>
                      <option value="Dr John Doe">Dr John Doe</option>
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Service</label>
                    <select className="form-select" {...register('service', { required: true })}>
                      <option value="">Select Service</option>
                      <option value="FIRST CONSULTATION">FIRST CONSULTATION</option>
                      <option value="FOLLOW UP CONSULTATION">FOLLOW UP CONSULTATION</option>
                      <option value="REPORT">REPORT</option>
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Status</label>
                    <select className="form-select" {...register('status')}>
                      <option value="BOOKED">BOOKED</option>
                      <option value="ARRIVED">ARRIVED</option>
                      <option value="ON-GOING">ON-GOING</option>
                      <option value="REVIEWED">REVIEWED</option>
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="col-md-6">
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Time</label>
                    <input type="time" className="form-control me-2" {...register('time', { required: true })} />
                    <select className="form-select w-50">
                      <option>PM</option>
                      <option>AM</option>
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Duration</label>
                    <select className="form-select" {...register('duration')}>
                      <option value="5 mins">5 mins</option>
                      <option value="15 mins">15 mins</option>
                      <option value="30 mins">30 mins</option>
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Date</label>
                    <input type="date" className="form-control" {...register('date')} />
                  </div>
                </div>
              </div>

              {/* Billing Section */}
              <div className="mt-4 pt-4 border-top">
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="skipBilling" {...register('skipBilling')} />
                  <label className="form-check-label text-danger" htmlFor="skipBilling">
                    Skip billing
                  </label>
                </div>

                {!skipBilling && (
                  <>
                    <div className="row g-3 align-items-center mb-4">
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">Unit Price</label>
                        <input type="number" className="form-control form-control-sm" {...register('unitPrice')} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">Qty</label>
                        <input type="number" className="form-control form-control-sm" {...register('qty')} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">Discount</label>
                        <input type="number" className="form-control form-control-sm" {...register('discount')} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">Tax</label>
                        <input type="number" className="form-control form-control-sm" {...register('tax')} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">Net Price</label>
                        <div className="fs-4 fw-normal">{netPrice > 0 ? netPrice : 0}</div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary btn-sm px-4 py-2 fw-bold" style={{ backgroundColor: '#1890ff', border: 'none' }}>SAVE APPOINTMENT</button>
                    </div>
                  </>
                )}
                {skipBilling && (
                   <div className="d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary btn-sm px-4 py-2 fw-bold" style={{ backgroundColor: '#1890ff', border: 'none' }}>SAVE APPOINTMENT</button>
                   </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
