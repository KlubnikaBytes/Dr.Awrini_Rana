import React from 'react';
import { UploadCloud, User } from 'lucide-react';

const ProfileTab = ({ patient }) => {
  return (
    <div className="d-flex flex-column flex-md-row h-100 bg-light">
      
      {/* Left Form Area */}
      <div className="flex-grow-1 p-4 overflow-auto">
        
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Patient Name*</label>
            <div className="d-flex">
              <select className="form-select border-end-0 rounded-end-0" style={{ width: '80px', backgroundColor: '#f8f9fa' }}>
                <option>Mrs</option>
                <option>Mr</option>
                <option>Ms</option>
              </select>
              <div className="input-group">
                <span className="input-group-text bg-white border-start-0 text-muted"><User size={16} /></span>
                <input type="text" className="form-control border-start-0 ps-0 fw-bold" defaultValue={patient?.name || ''} />
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Phone</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">📞</span>
              <input type="text" className="form-control border-start-0 ps-0" placeholder="Enter Number" defaultValue={patient?.phone || ''} />
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold small text-secondary">Gender*</label>
            <div className="d-flex border rounded bg-white overflow-hidden">
              <button className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${patient?.gender === 'Male' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>M</button>
              <div className="border-end"></div>
              <button className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${patient?.gender === 'Female' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>F</button>
              <div className="border-end"></div>
              <button className={`btn btn-sm flex-grow-1 border-0 rounded-0 ${patient?.gender === 'Other' ? 'btn-light fw-bold text-primary' : 'text-muted'}`}>Other</button>
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold small text-secondary">Age or DOB*</label>
            <div className="d-flex gap-2">
              <input type="number" className="form-control fw-bold" defaultValue={patient?.age || ''} style={{ width: '70px' }} />
              <select className="form-select text-muted" style={{ width: '100px' }}>
                <option>Years</option>
                <option>Months</option>
              </select>
              <input type="date" className="form-control text-muted fw-bold" defaultValue="1973-06-30" />
            </div>
          </div>

          <div className="col-md-5">
            <label className="form-label fw-semibold small text-secondary">Preferred Language</label>
            <select className="form-select text-muted">
              <option>English</option>
              <option>Hindi</option>
              <option>Bengali</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold small text-secondary">Pin</label>
            <input type="text" className="form-control" placeholder="Enter Pin" />
            
            <label className="form-label fw-semibold small text-secondary mt-3">City</label>
            <input type="text" className="form-control" placeholder="Enter City" />
          </div>

          <div className="col-md-8">
            <label className="form-label fw-semibold small text-secondary">Address</label>
            <textarea className="form-control" placeholder="Enter Address" rows="4"></textarea>
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
              <select className="form-select text-muted w-50">
                <option>Marital Status</option>
                <option>Married</option>
                <option>Single</option>
              </select>
              <div className="input-group w-50">
                <span className="input-group-text bg-white text-muted">📅</span>
                <input type="text" className="form-control border-start-0 ps-0 text-muted" placeholder="Since" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Blood Group</label>
            <select className="form-select text-muted">
              <option>Blood group</option>
              <option>A+</option>
              <option>O+</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Spouse Name</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted"><User size={16} /></span>
              <input type="text" className="form-control border-start-0 ps-0" placeholder="Enter Spouse Name" />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Spouse Blood Group</label>
            <select className="form-select text-muted">
              <option>Blood group</option>
              <option>A+</option>
              <option>O+</option>
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
            <input type="text" className="form-control fw-bold" defaultValue={patient?.patientId || ''} />
          </div>
          <div className="col-md-6"></div> {/* Empty spacer */}

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Referred By</label>
            <div className="d-flex gap-2">
              <input type="text" className="form-control w-50 text-muted" placeholder="Doctor Name" />
              <select className="form-select w-50 text-muted">
                <option>Speciality</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Email</label>
            <div className="input-group">
              <span className="input-group-text bg-white text-muted">✉</span>
              <input type="email" className="form-control border-start-0 ps-0" placeholder="Enter Email" />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Channel (How did the patient hear about you?)</label>
            <input type="text" className="form-control" placeholder="Enter Channel" />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">C/O</label>
            <input type="text" className="form-control" placeholder="Enter C/O" />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Occupation</label>
            <input type="text" className="form-control" placeholder="Enter Occupation" />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Tag</label>
            <input type="text" className="form-control" placeholder="Enter Tag" />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Mobile 2</label>
            <input type="text" className="form-control" placeholder="Enter Secondary Number" />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold small text-secondary">Aadhar Number</label>
            <input type="text" className="form-control" placeholder="Aadhar Card Number" />
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
        <button className="btn btn-primary w-100 fw-bold py-2 rounded-2" style={{ backgroundColor: '#4a4ae6', borderColor: '#4a4ae6' }}>
          Save Patient Details
        </button>
      </div>

    </div>
  );
};

export default ProfileTab;
