import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import serviceApi from '../../services/serviceApi';
import { getLocalDateString } from '../../utils/dateUtils';

const NewAppointmentModal = ({ onClose, onSuccess, prefillPatient, editData }) => {
  // Compute fresh each render so midnight crossings always show the right date
  const today = getLocalDateString();

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      status: editData?.status || 'BOOKED',
      duration: editData?.duration || '5 mins',
      date: editData?.date ? getLocalDateString(new Date(editData.date)) : today,
      qty: 1,
      discount: 0,
      tax: 0,
      // Pre-fill from patient context
      patientName: prefillPatient?.name || editData?.patientName || '',
      phone: prefillPatient?.phone || editData?.phone || '',
      age: prefillPatient?.age || editData?.age || '',
      gender: prefillPatient?.gender || editData?.gender || '',
      doctorName: editData?.doctorName || '',
      time: editData?.time || '',
    }
  });

  const skipBilling = watch('skipBilling');
  const unitPrice = parseFloat(watch('unitPrice')) || 0;
  const qty = parseFloat(watch('qty')) || 1;
  const discount = parseFloat(watch('discount')) || 0;
  const tax = parseFloat(watch('tax')) || 0;
  const [mobileError, setMobileError] = useState('');
  const [pinError, setPinError] = useState('');
  const [amPm, setAmPm] = useState(() => {
    // Detect AM/PM from pre-filled time string if available
    if (editData?.time) {
      return editData.time.includes('PM') ? 'PM' : 'AM';
    }
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  });
  
  const [doctors, setDoctors] = React.useState([]);
  const [services, setServices] = React.useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [staff, svcs] = await Promise.all([
          adminService.getStaff(),
          serviceApi.getServices().catch(() => [])
        ]);
        setDoctors((staff || []).filter(s => s.role === 'Doctor'));
        setServices(svcs || []);
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    fetchData();
  }, []);

  // DOB ↔ Age sync helpers
  const handleDobChange = (e) => {
    const dob = e.target.value;
    setValue('dob', dob);
    if (dob) {
      const today = new Date();
      const birth = new Date(dob);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      setValue('age', age >= 0 ? age : '');
    }
  };

  const handleAgeChange = (e) => {
    const age = parseInt(e.target.value);
    setValue('age', isNaN(age) ? '' : age);
    if (!isNaN(age) && age >= 0) {
      const today = new Date();
      const year = today.getFullYear() - age;
      const approxDob = `${year}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      setValue('dob', approxDob);
    }
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setValue('phone', val);
    setMobileError(val.length > 0 && val.length < 10 ? 'Mobile number must be 10 digits' : '');
  };

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue('pin', val);
    setPinError(val.length > 0 && val.length < 6 ? 'PIN must be 6 digits' : '');
  };

  // Net Price = (UnitPrice × Qty) − Discount% + Tax%
  const subtotal = unitPrice * qty;
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (tax / 100);
  const netPrice = afterDiscount + taxAmt;

  const onSubmit = async (data) => {
    // Block past dates for NEW appointments only
    if (!editData?._id && data.date && data.date < today) {
      alert('Cannot book an appointment on a past date.');
      return;
    }
    try {
      const payload = {
        patientName: data.patientName,
        doctorName: data.doctorName,
        service: data.service,
        status: data.status,
        time: (() => {
          // Convert 24h "HH:MM" + amPm to "HH:MM AM/PM" display string
          if (!data.time) return '';
          // If already has AM/PM (e.g. from editData), use as-is
          if (data.time.includes('AM') || data.time.includes('PM')) return data.time;
          const [h, m] = data.time.split(':').map(Number);
          const hour12 = h % 12 === 0 ? 12 : h % 12;
          return `${String(hour12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${amPm}`;
        })(),
        duration: data.duration,
        date: data.date,
        designation: data.designation,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        city: data.city,
        pin: data.pin,
        dob: data.dob,
        skipBilling: data.skipBilling,
        billingDetails: {
          unitPrice: Number(data.unitPrice),
          qty: Number(data.qty),
          discount: Number(data.discount),
          tax: Number(data.tax),
          netPrice: Number(netPrice)
        }
      };

      if (editData?._id) {
        // UPDATE existing appointment
        await frontdeskService.updateAppointment(editData._id, payload);
      } else {
        // CREATE new appointment
        await frontdeskService.createAppointment(payload);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      alert(editData?._id ? 'Error updating appointment' : 'Error creating appointment');
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">{editData?._id ? 'Edit Appointment' : 'New Appointment'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="row g-4">
                {/* Left Column */}
                <div className="col-md-6">
                  <h6 className="mb-3 text-primary border-bottom pb-2">Patient Details</h6>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Patient</label>
                    <div className="d-flex w-100 gap-2">
                      <select className="form-select bg-light" style={{ width: '100px' }} {...register('designation')}>
                        <option value="Mr">Mr.</option>
                        <option value="Mrs">Mrs.</option>
                        <option value="Ms">Ms.</option>
                        <option value="Dr">Dr.</option>
                        <option value="Master">Master</option>
                      </select>
                      <input type="text" className="form-control bg-light" placeholder="Patient Name" {...register('patientName', { required: true })} />
                    </div>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Mobile No</label>
                    <div className="w-100">
                      <input
                        type="text"
                        className={`form-control bg-light ${mobileError ? 'is-invalid' : ''}`}
                        placeholder="Mobile Number (10 digits)"
                        maxLength={10}
                        {...register('phone')}
                        onChange={handleMobileChange}
                      />
                      {mobileError && <div className="invalid-feedback">{mobileError}</div>}
                    </div>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Age & Gen</label>
                    <div className="d-flex w-100 gap-2">
                      <input
                        type="number"
                        className="form-control bg-light"
                        placeholder="Age"
                        style={{ width: '80px' }}
                        {...register('age')}
                        onChange={handleAgeChange}
                      />
                      <select className="form-select bg-light" {...register('gender')}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <h6 className="mb-3 text-primary border-bottom pb-2 mt-4">Appointment Details</h6>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Doctor</label>
                    <select className="form-select" {...register('doctorName', { required: true })}>
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Service</label>
                    <select className="form-select" {...register('service', { required: true })}>
                      <option value="">Select Service</option>
                      {['FIRST CONSULTATION', 'FOLLOW UP CONSULTATION', 'REPORT'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Status</label>
                    <select className="form-select" {...register('status')}>
                      <option value="BOOKED">BOOKED</option>
                      <option value="ARRIVED">ARRIVED</option>
                      <option value="ON-GOING">ON-GOING</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="col-md-6">
                  <h6 className="mb-3 text-primary border-bottom pb-2">Contact Details</h6>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Address</label>
                    <input type="text" className="form-control bg-light" placeholder="Address" {...register('address')} />
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>City</label>
                    <input type="text" className="form-control bg-light" placeholder="City" {...register('city')} />
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>PIN</label>
                    <div className="w-100">
                      <input
                        type="text"
                        className={`form-control bg-light ${pinError ? 'is-invalid' : ''}`}
                        placeholder="6-digit PIN"
                        maxLength={6}
                        {...register('pin')}
                        onChange={handlePinChange}
                      />
                      {pinError && <div className="invalid-feedback">{pinError}</div>}
                    </div>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>DOB</label>
                    <input
                      type="date"
                      className="form-control bg-light"
                      {...register('dob')}
                      onChange={handleDobChange}
                    />
                  </div>

                  <h6 className="mb-3 text-primary border-bottom pb-2 mt-4">Schedule</h6>
                  <div className="mb-3 d-flex align-items-center">
                    <label className="me-3" style={{ width: '80px' }}>Time</label>
                    <input
                      type="time"
                      className="form-control me-2"
                      {...register('time', { required: true })}
                      defaultValue={editData?.time ? (() => {
                        // Convert "HH:MM AM/PM" back to 24h for the input
                        const t = editData.time.replace(/ AM| PM/, '');
                        const [h, m] = t.split(':').map(Number);
                        const isPM = editData.time.includes('PM');
                        const h24 = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
                        return `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                      })() : ''}
                    />
                    <select
                      className="form-select w-50"
                      value={amPm}
                      onChange={e => setAmPm(e.target.value)}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
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
                    <input
                      type="date"
                      className="form-control"
                      min={editData?._id ? undefined : today}
                      {...register('date')}
                    />
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
                        <label className="form-label small fw-semibold text-secondary mb-1">Discount %</label>
                        <input type="number" min="0" max="100" className="form-control form-control-sm" {...register('discount')} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">Tax %</label>
                        <input type="number" min="0" max="100" className="form-control form-control-sm" {...register('tax')} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">Net Price</label>
                        <div className="fs-4 fw-normal">₹ {netPrice > 0 ? netPrice.toFixed(2) : '0.00'}</div>
                        <div className="text-muted" style={{fontSize:'0.7rem'}}>
                          {discount > 0 && <span>−₹{discountAmt.toFixed(2)} disc </span>}
                          {tax > 0 && <span>+₹{taxAmt.toFixed(2)} tax</span>}
                        </div>
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
