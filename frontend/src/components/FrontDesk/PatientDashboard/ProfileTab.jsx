import React, { useState, useEffect } from 'react';
import { UploadCloud, User } from 'lucide-react';
import frontdeskService from '../../../services/frontdeskService';

const ProfileTab = ({ patient }) => {
  const [formData, setFormData] = useState({
    designation: patient?.designation || 'Mr',
    name: patient?.name || '',
    phone: patient?.phone || '',
    gender: patient?.gender || '',
    age: patient?.age || '',
    dob: patient?.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
    patientId: patient?.patientId || '',
    address: patient?.address || '',
    city: patient?.city || '',
    pin: patient?.pin || '',
    bloodGroup: patient?.bloodGroup || '',
    preferredLanguage: patient?.preferredLanguage || 'English',
    maritalStatus: patient?.maritalStatus || '',
    maritalSince: patient?.maritalSince || '',
    spouseName: patient?.spouseName || '',
    spouseBloodGroup: patient?.spouseBloodGroup || '',
    referredByDoctor: patient?.referredByDoctor || '',
    referredBySpeciality: patient?.referredBySpeciality || '',
    email: patient?.email || '',
    channel: patient?.channel || '',
    co: patient?.co || '',
    occupation: patient?.occupation || '',
    tag: patient?.tag || '',
    mobile2: patient?.mobile2 || '',
    aadhar: patient?.aadhar || ''
  });
  const [ageUnit, setAgeUnit] = useState('Years');

  useEffect(() => {
    if (patient) {
      setFormData({
        designation: patient.designation || 'Mr',
        name: patient.name || '',
        phone: patient.phone || '',
        gender: patient.gender || '',
        age: patient.age || '',
        dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
        patientId: patient.patientId || '',
        address: patient.address || '',
        city: patient.city || '',
        pin: patient.pin || '',
        bloodGroup: patient.bloodGroup || '',
        preferredLanguage: patient.preferredLanguage || 'English',
        maritalStatus: patient.maritalStatus || '',
        maritalSince: patient.maritalSince || '',
        spouseName: patient.spouseName || '',
        spouseBloodGroup: patient.spouseBloodGroup || '',
        referredByDoctor: patient.referredByDoctor || '',
        referredBySpeciality: patient.referredBySpeciality || '',
        email: patient.email || '',
        channel: patient.channel || '',
        co: patient.co || '',
        occupation: patient.occupation || '',
        tag: patient.tag || '',
        mobile2: patient.mobile2 || '',
        aadhar: patient.aadhar || ''
      });
    }
  }, [patient]);


  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!patient?._id) return;
    setSaving(true);
    
    // Clean up formData before sending
    const payload = { ...formData };
    if (!payload.dob) {
      delete payload.dob;
    }

    try {
      await frontdeskService.updatePatient(patient._id, payload);
      alert('Patient details saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save patient details.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="d-flex flex-column flex-md-row h-100 bg-light">
      
      {/* Left Form Area */}
      <div className="flex-grow-1 p-4 overflow-auto">
        
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Patient Name*</label>
            <div className="d-flex">
              <select className="form-select border-end-0 rounded-end-0" style={{ width: '80px', backgroundColor: '#f8f9fa' }} value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}>
                <option value="Mrs">Mrs</option>
                <option value="Mr">Mr</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
                <option value="Master">Master</option>
              </select>
              <div className="input-group">
                <span className="input-group-text bg-white border-start-0 text-muted"><User size={16} /></span>
                <input type="text" className="form-control border-start-0 ps-0 fw-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Phone</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">📞</span>
              <input
                type="tel"
                className={`form-control border-start-0 ps-0 ${formData.phone && formData.phone.length > 0 && formData.phone.length < 10 ? 'border-danger' : ''}`}
                placeholder="10-digit number"
                maxLength={10}
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'').slice(0,10)})}
              />
            </div>
            {formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
              <div className="text-danger" style={{ fontSize: '0.72rem' }}>{10 - formData.phone.length} more digit{10 - formData.phone.length !== 1 ? 's' : ''} required</div>
            )}
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold small text-secondary">Gender*</label>
            <div className="d-flex border rounded bg-white overflow-hidden">
              <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${formData.gender === 'Male' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>M</button>
              <div className="border-end"></div>
              <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${formData.gender === 'Female' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>F</button>
              <div className="border-end"></div>
              <button onClick={() => setFormData({...formData, gender: 'Other'})} className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${formData.gender === 'Other' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>Other</button>
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold small text-secondary">Age or DOB*</label>
            <div className="d-flex gap-2 align-items-center">
              <input
                type="number"
                className="form-control fw-bold"
                placeholder="Age"
                value={formData.age}
                style={{ width: '70px', minWidth: '70px' }}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
              <select
                className="form-select"
                style={{ width: '100px', minWidth: '95px' }}
                value={ageUnit}
                onChange={e => setAgeUnit(e.target.value)}
              >
                <option value="Years">Years</option>
                <option value="Months">Months</option>
                <option value="Weeks">Weeks</option>
                <option value="Days">Days</option>
              </select>
              <input
                type="date"
                className="form-control text-muted fw-bold"
                value={formData.dob}
                onChange={e => setFormData({...formData, dob: e.target.value})}
              />
            </div>
          </div>

          <div className="col-md-5">
            <label className="form-label fw-semibold small text-secondary">Preferred Language</label>
            <select className="form-select text-muted" value={formData.preferredLanguage} onChange={e => setFormData({...formData, preferredLanguage: e.target.value})}>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Bengali">Bengali</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold small text-secondary">Pin</label>
            <input type="text" className="form-control" placeholder="Enter Pin" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} />
            
            <label className="form-label fw-semibold small text-secondary mt-3">City</label>
            <input type="text" className="form-control" placeholder="Enter City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
          </div>

          <div className="col-md-8">
            <label className="form-label fw-semibold small text-secondary">Address</label>
            <textarea className="form-control" placeholder="Enter Address" rows="4" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
          </div>
        </div>

        {/* Marital Status Section */}
        <div className="position-relative text-center my-4">
          <hr className="text-black-50" />
          <span className="position-absolute top-50 start-0 translate-middle-y bg-light pe-3 text-muted small fw-semibold" style={{ marginLeft: '10px' }}>Marital Status</span>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Marital Status</label>
            <div className="d-flex gap-2">
              <select className="form-select text-muted w-50" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                <option value="">Marital Status</option>
                <option value="Married">Married</option>
                <option value="Single">Single</option>
              </select>
              <div className="input-group w-50">
                <span className="input-group-text bg-white text-muted">📅</span>
                <input type="text" className="form-control border-start-0 ps-0 text-muted" placeholder="Since" value={formData.maritalSince} onChange={e => setFormData({...formData, maritalSince: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Blood Group</label>
            <select className="form-select text-muted" value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>
              <option value="">Blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Spouse Name</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted"><User size={16} /></span>
              <input type="text" className="form-control border-start-0 ps-0" placeholder="Enter Spouse Name" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Spouse Blood Group</label>
            <select className="form-select text-muted" value={formData.spouseBloodGroup} onChange={e => setFormData({...formData, spouseBloodGroup: e.target.value})}>
              <option value="">Blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        {/* Other Details Section */}
        <div className="position-relative text-center my-4">
          <hr className="text-black-50" />
          <span className="position-absolute top-50 start-0 translate-middle-y bg-light pe-3 text-muted small fw-semibold" style={{ marginLeft: '10px' }}>Other Details</span>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Existing ID (if any)</label>
            <input type="text" className="form-control fw-bold" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})} />
          </div>
          <div className="col-md-6"></div> {/* Empty spacer */}

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Referred By</label>
            <div className="d-flex gap-2">
              <input type="text" className="form-control w-50 text-muted" placeholder="Doctor Name" value={formData.referredByDoctor} onChange={e => setFormData({...formData, referredByDoctor: e.target.value})} />
              <select className="form-select w-50 text-muted" value={formData.referredBySpeciality} onChange={e => setFormData({...formData, referredBySpeciality: e.target.value})}>
                <option value="">Speciality</option>
                <option>Anesthesiologist</option>
                <option>Cardiologist</option>
                <option>Counsellor</option>
                <option>CVT Surgeon</option>
                <option>Dental</option>
                <option>Dental Surgeon</option>
                <option>Dermatologist</option>
                <option>Diabetologist</option>
                <option>Dietician</option>
                <option>ENT Specialist</option>
                <option>Endocrinologist</option>
                <option>Gastroenterologist</option>
                <option>General Physician</option>
                <option>General Surgeon</option>
                <option>Gynaecologist</option>
                <option>Haematologist</option>
                <option>Homeopath</option>
                <option>Intensivist</option>
                <option>Nephrologist</option>
                <option>Neurologist</option>
                <option>Neurosurgeon</option>
                <option>Oncologist</option>
                <option>Ophthalmologist</option>
                <option>Orthopaedic Surgeon</option>
                <option>Paediatrician</option>
                <option>Pathologist</option>
                <option>Physiotherapist</option>
                <option>Plastic Surgeon</option>
                <option>Psychiatrist</option>
                <option>Pulmonologist</option>
                <option>Radiologist</option>
                <option>Rheumatologist</option>
                <option>Urologist</option>
                <option>Vascular Surgeon</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Email</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">✉</span>
              <input type="email" className="form-control border-start-0 ps-0" placeholder="Enter Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Channel (How did the patient hear about you?)</label>
            <input type="text" className="form-control" placeholder="Enter Channel" value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value})} />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">C/O</label>
            <input type="text" className="form-control" placeholder="Enter C/O" value={formData.co} onChange={e => setFormData({...formData, co: e.target.value})} />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Occupation</label>
            <input type="text" className="form-control" placeholder="Enter Occupation" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Tag</label>
            <input type="text" className="form-control" placeholder="Enter Tag" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Mobile 2</label>
            <input type="text" className="form-control" placeholder="Enter Secondary Number" value={formData.mobile2} onChange={e => setFormData({...formData, mobile2: e.target.value})} />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Aadhar Number</label>
            <input
              type="tel"
              className={`form-control ${formData.aadhar && formData.aadhar.length > 0 && formData.aadhar.length < 12 ? 'border-danger' : ''}`}
              placeholder="12-digit Aadhar number"
              maxLength={12}
              value={formData.aadhar || ''}
              onChange={e => setFormData({...formData, aadhar: e.target.value.replace(/\D/g,'').slice(0,12)})}
            />
            {formData.aadhar && formData.aadhar.length > 0 && formData.aadhar.length < 12 && (
              <div className="text-danger" style={{ fontSize: '0.72rem' }}>{12 - formData.aadhar.length} more digit{12 - formData.aadhar.length !== 1 ? 's' : ''} required</div>
            )}
          </div>
        </div>

      </div>

      {/* Right Sidebar - Photo Upload */}
      <div className="bg-white p-3 border-md-start shadow-sm d-flex flex-column align-items-center profile-sidebar">
        <div className="w-100 bg-light rounded-4 d-flex align-items-center justify-content-center mb-4" style={{ height: '180px', border: '2px dashed #dee2e6' }}>
          <div className="text-primary text-center opacity-75">
            <div className="bg-primary bg-opacity-25 rounded-circle d-inline-flex p-3 mb-2">
              <UploadCloud size={32} className="text-primary" />
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary w-100 fw-bold py-2 rounded-2" style={{ backgroundColor: '#4a4ae6', borderColor: '#4a4ae6' }}>
          {saving ? 'Saving...' : 'Save Patient Details'}
        </button>
      </div>

    </div>
  );
};

export default ProfileTab;
