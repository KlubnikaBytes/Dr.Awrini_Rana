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
      email: prefillPatient?.email || editData?.email || '',
      age: prefillPatient?.age || editData?.age || '',
      gender: prefillPatient?.gender || editData?.gender || '',
      bloodGroup: prefillPatient?.bloodGroup || editData?.bloodGroup || '',
      referredByDoctor: editData?.referredByDoctor || '',
      doctorName: editData?.doctorName || '',
      queueNumber: editData?.queueNumber || '',
    }
  });

  const skipBilling = watch('skipBilling');
  const unitPrice = parseFloat(watch('unitPrice')) || 0;
  const qty = parseFloat(watch('qty')) || 1;
  const discount = parseFloat(watch('discount')) || 0;
  const tax = parseFloat(watch('tax')) || 0;
  const [mobileError, setMobileError] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ageUnit, setAgeUnit] = useState('Years');
  
  const [doctors, setDoctors] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [referralDoctors, setReferralDoctors] = React.useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [staff, svcs, refDocs] = await Promise.all([
          adminService.getStaff(),
          serviceApi.getServices().catch(() => []),
          adminService.getReferralDoctors().catch(() => [])
        ]);
        setDoctors((staff || []).filter(s => s.role === 'Doctor'));
        setServices(svcs || []);
        setReferralDoctors(refDocs || []);
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
      let approxDob;
      if (ageUnit === 'Years') {
        const year = today.getFullYear() - age;
        approxDob = `${year}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      } else if (ageUnit === 'Months') {
        const d = new Date(today);
        d.setMonth(d.getMonth() - age);
        approxDob = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      } else if (ageUnit === 'Weeks') {
        const d = new Date(today);
        d.setDate(d.getDate() - age * 7);
        approxDob = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      } else if (ageUnit === 'Days') {
        const d = new Date(today);
        d.setDate(d.getDate() - age);
        approxDob = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
      if (approxDob) setValue('dob', approxDob);
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
    if (isSubmitting) return; // prevent double-submission
    // Block past dates for NEW appointments only
    if (!editData?._id && data.date && data.date < today) {
      alert('Cannot book an appointment on a past date.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        patientName: data.patientName,
        doctorName: data.doctorName,
        service: data.service,
        status: data.status,
        queueNumber: data.queueNumber,
        date: data.date,
        designation: data.designation,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
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
      const msg = error.response?.data?.message;
      alert(msg || (editData?._id ? 'Error updating appointment' : 'Error creating appointment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content hp-card border-0 shadow-lg" style={{ overflow: 'hidden' }}>
          <div className="modal-header border-bottom pb-3 pt-4 px-4" style={{ background: 'var(--gray-50)' }}>
            <h4 className="modal-title fw-bold" style={{ color: 'var(--navy-mid)' }}>
              {editData?._id ? 'Edit Appointment' : 'New Appointment'}
            </h4>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body p-4 bg-light">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="row g-4">
                
                {/* ── Patient & Contact Card ── */}
                <div className="col-lg-7">
                  <div className="hp-card p-4 h-100">
                    <h6 className="mb-4 text-primary fw-bold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.85rem' }}>Patient Details</h6>
                    
                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <label className="form-label text-secondary small fw-semibold">Title</label>
                        <select className="form-select hp-input" {...register('designation')}>
                          <option value="Mr">Mr.</option>
                          <option value="Mrs">Mrs.</option>
                          <option value="Ms">Ms.</option>
                          <option value="Dr">Dr.</option>
                          <option value="Master">Master</option>
                        </select>
                      </div>
                      <div className="col-md-9">
                        <label className="form-label text-secondary small fw-semibold">Full Name *</label>
                        <input type="text" className="form-control hp-input" placeholder="Enter patient name" {...register('patientName', { required: true })} />
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Mobile Number</label>
                        <input
                          type="text"
                          className={`form-control hp-input ${mobileError ? 'is-invalid border-danger' : ''}`}
                          placeholder="10 digits"
                          maxLength={10}
                          {...register('phone')}
                          onChange={handleMobileChange}
                        />
                        {mobileError && <div className="invalid-feedback">{mobileError}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Email Address</label>
                        <input type="email" className="form-control hp-input" placeholder="Email" {...register('email')} />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Age & Gender</label>
                        <div className="d-flex gap-2">
                          <input
                            type="number"
                            className="form-control hp-input"
                            placeholder="Age"
                            {...register('age')}
                            onChange={handleAgeChange}
                          />
                          <select className="form-select hp-input" value={ageUnit} onChange={e => setAgeUnit(e.target.value)} style={{ width: '100px' }}>
                            <option value="Years">Years</option>
                            <option value="Months">Months</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Days">Days</option>
                          </select>
                          <select className="form-select hp-input" {...register('gender')}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Blood Group</label>
                        <select className="form-select hp-input" {...register('bloodGroup')}>
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Referred By (Doctor)</label>
                        <select className="form-select hp-input" {...register('referredByDoctor')}>
                          <option value="">Select Referring Doctor</option>
                          {referralDoctors.filter(d => d.type === 'BY' || !d.type).map(doc => (
                            <option key={doc._id} value={doc.name}>{doc.name} ({doc.specialization})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-12">
                        <label className="form-label text-secondary small fw-semibold">Address</label>
                        <input type="text" className="form-control hp-input" placeholder="Full address" {...register('address')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">City</label>
                        <input type="text" className="form-control hp-input" placeholder="City" {...register('city')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">PIN Code</label>
                        <input
                          type="text"
                          className={`form-control hp-input ${pinError ? 'is-invalid border-danger' : ''}`}
                          placeholder="6-digit PIN"
                          maxLength={6}
                          {...register('pin')}
                          onChange={handlePinChange}
                        />
                        {pinError && <div className="invalid-feedback">{pinError}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Appointment & Schedule Card ── */}
                <div className="col-lg-5">
                  <div className="hp-card p-4 mb-4">
                    <h6 className="mb-4 text-primary fw-bold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.85rem' }}>Appointment Details</h6>
                    
                    <div className="row g-3">
                      <div className="col-md-12">
                        <label className="form-label text-secondary small fw-semibold">Doctor *</label>
                        <select className="form-select hp-input" {...register('doctorName', { required: true })}>
                          <option value="">Select Doctor</option>
                          {doctors.map(d => (
                            <option key={d._id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label text-secondary small fw-semibold">Service *</label>
                        <select className="form-select hp-input" {...register('service', { required: true })}>
                          <option value="">Select Service</option>
                          {services.filter(s => s.type === 'Consultation').map(s => (
                            <option key={s._id} value={s.serviceName}>{s.serviceName}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Date *</label>
                        <input
                          type="date"
                          className="form-control hp-input"
                          min={editData?._id ? undefined : today}
                          {...register('date')}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-semibold">Queue No</label>
                        <input
                          type="number"
                          className="form-control hp-input"
                          placeholder="Auto-assigned"
                          min="1"
                          {...register('queueNumber')}
                        />
                      </div>
                      
                      <div className="col-md-12">
                        <label className="form-label text-secondary small fw-semibold">Status</label>
                        <select className="form-select hp-input fw-bold" style={{ color: 'var(--primary-dark)' }} {...register('status')}>
                          <option value="BOOKED">BOOKED</option>
                          <option value="ARRIVED">ARRIVED</option>
                          <option value="ON-GOING">ON-GOING</option>
                          <option value="REVIEWED">REVIEWED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Billing Card ── */}
                  <div className="hp-card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 text-primary fw-bold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.85rem' }}>Billing</h6>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="skipBilling" {...register('skipBilling')} />
                        <label className="form-check-label small fw-semibold text-danger" htmlFor="skipBilling">Skip Billing</label>
                      </div>
                    </div>

                    {!skipBilling ? (
                      <div className="row g-2 align-items-center">
                        <div className="col-6">
                          <label className="form-label small text-secondary mb-1">Unit Price</label>
                          <input type="number" className="form-control hp-input" {...register('unitPrice')} />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-secondary mb-1">Qty</label>
                          <input type="number" className="form-control hp-input" {...register('qty')} />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-secondary mb-1">Discount %</label>
                          <input type="number" min="0" max="100" className="form-control hp-input" {...register('discount')} />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-secondary mb-1">Tax %</label>
                          <input type="number" min="0" max="100" className="form-control hp-input" {...register('tax')} />
                        </div>
                        <div className="col-12 mt-3 p-3 bg-light rounded border d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-secondary small fw-semibold">Net Price</div>
                            <div className="text-muted" style={{fontSize:'0.65rem'}}>
                              {discount > 0 && <span>−₹{discountAmt.toFixed(2)} </span>}
                              {tax > 0 && <span>+₹{taxAmt.toFixed(2)} </span>}
                            </div>
                          </div>
                          <div className="fs-3 fw-bold text-primary">₹ {netPrice > 0 ? netPrice.toFixed(2) : '0.00'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-light rounded border text-center text-secondary small">
                        Billing will be skipped for this appointment.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top">
                <button type="button" className="btn-hp-ghost" onClick={onClose}>CANCEL</button>
                <button type="submit" className="btn-hp-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'SAVE APPOINTMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
