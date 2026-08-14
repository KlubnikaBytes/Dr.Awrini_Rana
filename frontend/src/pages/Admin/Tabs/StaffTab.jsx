import React, { useState, useEffect } from 'react';
import { Search, User, Phone, Mail, Settings, Trash2, Edit3 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import adminService from '../../../services/adminService';
import './StaffTab.css';

const StaffTab = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [innerTab, setInnerTab] = useState('Details');
  // Permissions state
  const [permissions, setPermissions] = useState({
    frontdesk: true, billing: true, doctor: false, lab: false,
    daycare: false, homecare: false, reports: false, admin: false
  });
  // Availability state
  const [availability, setAvailability] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
    startTime: '09:00', endTime: '18:00'
  });
  // IPD state
  const [ipdEnabled, setIpdEnabled] = useState(false);

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
    setIsEditing(false);
    setSignatureBase64('');
    setPhoneVal('');
    setInnerTab('Details');
    reset({});
  };

  // KEY FIX: call reset() with staff values so form repopulates on every click
  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    setIsAddingNew(false);
    setIsEditing(false);
    setSignatureBase64(staff.signatureImage || '');
    setPhoneVal(staff.phone || '');
    setInnerTab('Details');
    setPermissions(staff.permissions || {
      frontdesk: true, billing: true, doctor: false, lab: false,
      daycare: false, homecare: false, reports: false, admin: false
    });
    setAvailability(staff.availability || {
      Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
      startTime: '09:00', endTime: '18:00'
    });
    setIpdEnabled(staff.ipdEnabled || false);
    reset({
      name: staff.name || '',
      gender: staff.gender || 'Male',
      role: staff.role || '',
      email: staff.email || '',
      phone: staff.phone || '',
      signatureText: staff.signatureText || '',
      department: staff.department || 'None',
    });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setPhoneVal(selectedStaff?.phone || '');
    reset({
      name: selectedStaff?.name || '',
      gender: selectedStaff?.gender || 'Male',
      role: selectedStaff?.role || '',
      email: selectedStaff?.email || '',
      phone: selectedStaff?.phone || '',
      signatureText: selectedStaff?.signatureText || '',
      department: selectedStaff?.department || 'None',
    });
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

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Delete staff member "${staff.name}"? This cannot be undone.`)) return;
    try {
      await adminService.deleteStaff(staff._id);
      setSelectedStaff(null);
      setIsEditing(false);
      reset({});
      fetchStaff();
    } catch (error) {
      alert('Failed to delete staff: ' + (error.response?.data?.message || error.message));
    }
  };

  const onSubmit = async (data) => {
    const phone = phoneVal.trim();
    if (!/^\d{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    const payload = { ...data, phone, signatureImage: signatureBase64 };

    if (isEditing && selectedStaff) {
      // Update existing staff
      try {
        await adminService.updateStaff(selectedStaff._id, payload);
        await fetchStaff();
        setIsEditing(false);
        alert('Staff updated successfully!');
      } catch (error) {
        alert('Error updating staff: ' + (error.response?.data?.message || error.message));
      }
      return;
    }

    // Adding new staff - password required
    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{8,}$/.test(data.password)) {
      alert('Password must be at least 8 alphanumeric characters.');
      return;
    }
    try {
      await adminService.addStaff(payload);
      fetchStaff();
      setIsAddingNew(false);
      alert('Staff added successfully!');
    } catch (error) {
      alert('Error adding staff: ' + (error.response?.data?.message || error.message));
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
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small fw-bold me-2">ROLE : {isAddingNew ? 'NEW' : selectedStaff?.role?.toUpperCase()}</span>
                {!isAddingNew && !isEditing && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary py-0 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={handleEditClick}
                    >
                      <Edit3 size={12} className="me-1" />Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleDeleteStaff(selectedStaff)}
                    >
                      <Trash2 size={12} className="me-1" />Delete
                    </button>
                  </>
                )}
                {isEditing && (
                  <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>Editing</span>
                )}
              </div>
            </div>

            {/* Inner Tabs */}
            <div className="d-flex border-bottom px-3 pt-2 bg-light">
              {['Details', 'Permissions', 'Availability', 'IPD Permission'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`btn border-0 rounded-0 px-3 py-2 fw-semibold ${innerTab === tab ? 'text-primary' : 'text-muted'}`}
                  style={{ fontSize: '0.82rem', borderBottom: innerTab === tab ? '2.5px solid #0d6efd' : '2.5px solid transparent' }}
                  onClick={() => setInnerTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 overflow-auto flex-grow-1">

              {/* ── Details Tab ── */}
              {innerTab === 'Details' && (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Person Name:</label>
                    <input type="text" className="form-control form-control-sm" {...register("name", { required: true })} disabled={!isAddingNew && !isEditing} defaultValue={selectedStaff?.name || ''} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Gender:</label>
                    <div className="d-flex gap-3 mt-1">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" value="Male" {...register("gender", { required: true })} disabled={!isAddingNew && !isEditing} defaultChecked={selectedStaff?.gender === 'Male'} />
                        <label className="form-check-label small">Male</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" value="Female" {...register("gender", { required: true })} disabled={!isAddingNew && !isEditing} defaultChecked={selectedStaff?.gender === 'Female'} />
                        <label className="form-check-label small">Female</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Designation / Role:</label>
                    <select className="form-select form-select-sm" {...register("role", { required: true })} disabled={!isAddingNew && !isEditing} defaultValue={selectedStaff?.role || ''}>
                      <option value="">Select Designation</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Day Care">Day Care</option>
                      <option value="Home Care">Home Care</option>
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
                    <input type="email" className="form-control form-control-sm" {...register("email", { required: true })} disabled={!isAddingNew && !isEditing} defaultValue={selectedStaff?.email || ''} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">*Phone Number:</label>
                    <input
                      type="tel"
                      className={`form-control form-control-sm ${phoneVal && phoneVal.length > 0 && phoneVal.length < 10 ? 'border-danger' : ''}`}
                      value={phoneVal}
                      disabled={!isAddingNew && !isEditing}
                      maxLength={10}
                      onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    {phoneVal && phoneVal.length > 0 && phoneVal.length < 10 && (
                      <div className="text-danger" style={{ fontSize: '0.72rem' }}>{10 - phoneVal.length} more digit{10 - phoneVal.length !== 1 ? 's' : ''} required</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">{isAddingNew ? '*Password' : 'New Password'}:</label>
                    <input type="text" className="form-control form-control-sm" placeholder="atleast 8 alpha numeric characters" {...register("password", { required: isAddingNew })} disabled={!isAddingNew && !isEditing} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Signature Text:</label>
                    <input type="text" className="form-control form-control-sm" {...register("signatureText")} disabled={!isAddingNew && !isEditing} defaultValue={selectedStaff?.signatureText || ''} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Department Name:</label>
                    <select className="form-select form-select-sm" {...register("department")} disabled={!isAddingNew && !isEditing} defaultValue={selectedStaff?.department || ''}>
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
                      {(isAddingNew || isEditing) && (
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

                  {(isAddingNew || isEditing) && (
                    <div className="col-12 mt-4 mb-2 pb-2 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm">
                        {isAddingNew ? 'Create New Staff' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
              )}

              {/* ── Permissions Tab ── */}
              {innerTab === 'Permissions' && (
                <div>
                  <div className="fw-bold mb-3 text-dark" style={{ fontSize: '0.9rem' }}>Module Access Permissions</div>
                  <div className="row g-3">
                    {Object.entries({
                      frontdesk: 'Front Desk', billing: 'Billing', doctor: 'Doctor',
                      lab: 'Laboratory', daycare: 'Day Care', homecare: 'Home Care',
                      reports: 'Reports', admin: 'Admin'
                    }).map(([key, label]) => (
                      <div key={key} className="col-md-6">
                        <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded border">
                          <span className="fw-semibold" style={{ fontSize: '0.88rem' }}>{label}</span>
                          <div className="form-check form-switch mb-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              checked={permissions[key] || false}
                              onChange={e => setPermissions(p => ({ ...p, [key]: e.target.checked }))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-primary px-4" onClick={() => alert('Permissions saved!')}>
                      Save Permissions
                    </button>
                  </div>
                </div>
              )}

              {/* ── Availability Tab ── */}
              {innerTab === 'Availability' && (
                <div>
                  <div className="fw-bold mb-3 text-dark" style={{ fontSize: '0.9rem' }}>Working Days</div>
                  <div className="d-flex gap-2 flex-wrap mb-4">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                      <button
                        key={day} type="button"
                        className={`btn btn-sm px-3 fw-semibold ${availability[day] ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 20, fontSize: '0.82rem' }}
                        onClick={() => setAvailability(a => ({ ...a, [day]: !a[day] }))}
                      >{day}</button>
                    ))}
                  </div>
                  <div className="fw-bold mb-2 text-dark" style={{ fontSize: '0.9rem' }}>Working Hours</div>
                  <div className="d-flex align-items-center gap-3">
                    <div>
                      <label className="form-label small text-muted fw-bold">Start Time</label>
                      <input type="time" className="form-control form-control-sm"
                        value={availability.startTime}
                        onChange={e => setAvailability(a => ({ ...a, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="mt-3 text-muted fw-bold">—</div>
                    <div>
                      <label className="form-label small text-muted fw-bold">End Time</label>
                      <input type="time" className="form-control form-control-sm"
                        value={availability.endTime}
                        onChange={e => setAvailability(a => ({ ...a, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-primary px-4" onClick={() => alert('Availability saved!')}>
                      Save Availability
                    </button>
                  </div>
                </div>
              )}

              {/* ── IPD Permission Tab ── */}
              {innerTab === 'IPD Permission' && (
                <div>
                  <div className="fw-bold mb-3 text-dark" style={{ fontSize: '0.9rem' }}>IPD (In-Patient Department) Access</div>
                  <div className="p-4 bg-light rounded border d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold">Enable IPD Admission Rights</div>
                      <div className="text-muted small mt-1">Allow this staff member to admit and manage IPD patients.</div>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        style={{ width: '2.5rem', height: '1.25rem' }}
                        checked={ipdEnabled}
                        onChange={e => setIpdEnabled(e.target.checked)}
                      />
                    </div>
                  </div>
                  {ipdEnabled && (
                    <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success rounded text-success small fw-semibold">
                      ✓ IPD access enabled — this staff can admit and manage in-patients.
                    </div>
                  )}
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-primary px-4" onClick={() => alert('IPD permissions saved!')}>
                      Save IPD Settings
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default StaffTab;
