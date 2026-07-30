import React, { useState, useEffect } from 'react';
import { Search, User, Phone, Mail, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import adminService from '../../../services/adminService';
import './StaffTab.css';

const StaffTab = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await adminService.getStaff();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setIsAddingNew(true);
    setSignatureBase64('');
    reset(); // Clear form
  };

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    setIsAddingNew(false);
    setSignatureBase64(staff.signatureImage || '');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      await adminService.addStaff({ ...data, signatureImage: signatureBase64 });
      fetchStaff(); // Refresh list
      setIsAddingNew(false);
      alert("Staff added successfully!");
    } catch (error) {
      alert("Error adding staff: " + (error.response?.data?.message || error.message));
    }
  };

  const filteredStaff = (Array.isArray(staffList) ? staffList : []).filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="d-flex h-100 p-2 gap-2" style={{ backgroundColor: '#f5f7fa' }}>
      
      {/* Left Panel - Staff List */}
      <div className="bg-white border rounded d-flex flex-column" style={{ width: '45%' }}>
        
        {/* Toolbar */}
        <div className="d-flex align-items-center justify-content-between p-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <div className="position-relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="form-control form-control-sm bg-light border-0 ps-3" 
                style={{ width: '150px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={14} className="position-absolute top-50 translate-middle-y end-0 me-2 text-muted" />
            </div>
            <span className="text-muted small ms-2">Total: {filteredStaff.length}</span>
          </div>
          <button className="btn btn-primary btn-sm px-3" onClick={handleAddNew}>+ Add New</button>
        </div>

        {/* List */}
        <div className="flex-grow-1 overflow-auto p-2">
          {filteredStaff.map((staff, i) => (
            <div 
              key={i} 
              className={`staff-list-item d-flex p-3 border mb-2 rounded position-relative ${selectedStaff?._id === staff._id ? 'active' : ''}`}
              onClick={() => handleSelectStaff(staff)}
              style={{ cursor: 'pointer', backgroundColor: selectedStaff?._id === staff._id ? '#e6f2ff' : '#fff' }}
            >
              {selectedStaff?._id === staff._id && <div className="position-absolute top-0 start-0 h-100 bg-primary" style={{ width: '4px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}></div>}
              <div className="me-3">
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                  <User size={20} className="text-primary" />
                </div>
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h6 className="mb-0 text-dark">{staff.name}</h6>
                  <span className="text-muted small">(Role: {staff.role} | ID: {staff.staffId})</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small d-flex align-items-center"><Mail size={12} className="me-1" /> {staff.email}</span>
                  <span className="text-muted small d-flex align-items-center"><Phone size={12} className="me-1" /> {staff.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Details / Form */}
      <div className="bg-white border rounded flex-grow-1 d-flex flex-column">
        
        {!isAddingNew && !selectedStaff ? (
           <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 text-muted">
             <div className="mb-4">
                <User size={64} className="text-light" />
             </div>
             <h5>Select a staff member to view details</h5>
             <p>or click "+ Add New" to register a new staff member.</p>
             <button className="btn btn-primary mt-3" onClick={handleAddNew}>+ Add New Staff</button>
           </div>
        ) : (
          <>
            {/* Header */}
            <div className="d-flex align-items-center p-3 border-bottom" style={{ backgroundColor: '#f0f2f5' }}>
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                 <User size={20} className="text-white" />
              </div>
              <div className="flex-grow-1">
                 <h5 className="mb-0">{isAddingNew ? 'New Staff Member' : selectedStaff?.name}</h5>
              </div>
              <div>
                <span className="text-muted small fw-bold me-3">ROLE : {isAddingNew ? 'NEW' : selectedStaff?.role?.toUpperCase()}</span>
                {!isAddingNew && <Settings size={20} className="text-muted" style={{ cursor: 'pointer' }} />}
              </div>
            </div>

            {/* Inner Tabs (mock) */}
            <div className="d-flex border-bottom px-3 pt-2 bg-light">
              <span className="hp-inner-tab active">Details</span>
              <span className="hp-inner-tab">Permissions</span>
              <span className="hp-inner-tab">Availability</span>
              <span className="hp-inner-tab">IPD Permission</span>
            </div>

            {/* Form Content */}
            <div className="p-4 overflow-auto">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Person Name:</label>
                    <input type="text" className="form-control form-control-sm" {...register("name", { required: true })} disabled={!isAddingNew} defaultValue={selectedStaff?.name || ''} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Gender:</label>
                    <div className="d-flex gap-3 mt-1">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" value="Male" {...register("gender", { required: true })} disabled={!isAddingNew} defaultChecked={selectedStaff?.gender === 'Male'} />
                        <label className="form-check-label small">Male</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" value="Female" {...register("gender", { required: true })} disabled={!isAddingNew} defaultChecked={selectedStaff?.gender === 'Female'} />
                        <label className="form-check-label small">Female</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Designation / Role:</label>
                    <select className="form-select form-select-sm" {...register("role", { required: true })} disabled={!isAddingNew} defaultValue={selectedStaff?.role || ''}>
                      <option value="">Select Designation</option>
                      <option value="Frontdesk">Frontdesk</option>
                      <option value="LabTech">LabTech</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Onco Nurse">Onco Nurse</option>
                      <option value="Senior Nurse">Senior Nurse</option>
                      <option value="Junior Nurse">Junior Nurse</option>
                      <option value="Billing Desk">Billing Desk</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Login Email:</label>
                    <input type="email" className="form-control form-control-sm" {...register("email", { required: true })} disabled={!isAddingNew} defaultValue={selectedStaff?.email || ''} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Phone Number:</label>
                    <input type="text" className="form-control form-control-sm" {...register("phone", { required: true })} disabled={!isAddingNew} defaultValue={selectedStaff?.phone || ''} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">{isAddingNew ? '*Password' : 'New Password'}:</label>
                    <input type="text" className="form-control form-control-sm" placeholder="atleast 8 alpha numeric characters" {...register("password", { required: isAddingNew })} disabled={!isAddingNew} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Signature Text:</label>
                    <input type="text" className="form-control form-control-sm" {...register("signatureText")} disabled={!isAddingNew} defaultValue={selectedStaff?.signatureText || ''} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Department Name:</label>
                    <select className="form-select form-select-sm" {...register("department")} disabled={!isAddingNew} defaultValue={selectedStaff?.department || ''}>
                      <option value="None">None</option>
                      <option value="Internal medicine">Internal medicine</option>
                    </select>
                  </div>

                  <div className="col-12 mt-4">
                    <label className="form-label small fw-bold text-muted">Signature Image:</label>
                    <div className="border border-dashed p-4 text-center rounded bg-light position-relative" style={{ borderStyle: 'dashed', minHeight: '120px' }}>
                      {signatureBase64 ? (
                        <img src={signatureBase64} alt="Signature" style={{ maxHeight: '100px', maxWidth: '100%' }} />
                      ) : (
                        <span className="text-muted fw-bold">
                          {isAddingNew ? 'UPLOAD SIGNATURE' : 'No signature available'}
                        </span>
                      )}
                      {isAddingNew && (
                        <input 
                          type="file" 
                          accept="image/*"
                          className="position-absolute top-0 start-0 w-100 h-100" 
                          style={{ opacity: 0, cursor: 'pointer' }}
                          onChange={handleImageUpload}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {isAddingNew && (
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-light border me-2" onClick={() => setIsAddingNew(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary px-4">Save</button>
                  </div>
                )}
              </form>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default StaffTab;
