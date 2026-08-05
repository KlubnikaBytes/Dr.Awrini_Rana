import React, { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, Filter, Printer, Info, Plus, ChevronDown, Stethoscope, FileText, Paperclip, Briefcase, PlusCircle, FileSpreadsheet } from 'lucide-react';
import frontdeskService from '../services/frontdeskService';
import useSessionState from '../hooks/useSessionState';
import NewAppointmentModal from '../components/FrontDesk/NewAppointmentModal';
import AddBillModal from '../components/FrontDesk/AddBillModal';
import VitalsModal from '../components/FrontDesk/VitalsModal';
import TestResultModal from '../components/FrontDesk/TestResultModal';
import PrescriptionModal from '../components/FrontDesk/PrescriptionModal';
import AttachmentModal from '../components/FrontDesk/AttachmentModal';
import PatientDashboardModal from '../components/FrontDesk/PatientDashboard/PatientDashboardModal';

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useSessionState('dashboard_statusFilter', 'All');
  const [dateFilter, setDateFilter] = useSessionState('dashboard_dateFilter', new Date().toISOString().split('T')[0]);
  const [doctorFilter, setDoctorFilter] = useSessionState('dashboard_doctorFilter', '');
  const [nameFilter, setNameFilter] = useSessionState('dashboard_nameFilter', '');

  // Modals
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [selectedApptForBill, setSelectedApptForBill] = useState(null);
  const [selectedApptForVitals, setSelectedApptForVitals] = useState(null);
  const [selectedApptForTestResults, setSelectedApptForTestResults] = useState(null);
  const [selectedApptForPrescription, setSelectedApptForPrescription] = useState(null);
  const [selectedApptForAttachment, setSelectedApptForAttachment] = useState(null);
  const [selectedDashboardPatient, setSelectedDashboardPatient] = useSessionState('dashboard_selectedPatient', null);
  const [selectedDashboardAppointmentId, setSelectedDashboardAppointmentId] = useSessionState('dashboard_selectedAppointmentId', null);
  const [initialDashboardTab, setInitialDashboardTab] = useSessionState('dashboard_initialTab', 'Appnt');
  const [dropdownOpenId, setDropdownOpenId] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase();
      if (dateFilter) params.date = dateFilter;
      if (doctorFilter) params.doctorName = doctorFilter;

      const data = await frontdeskService.getAppointments(params);
      
      // Client side name filter
      if (nameFilter) {
        setAppointments(data.filter(a => a.patient?.name?.toLowerCase().includes(nameFilter.toLowerCase())));
      } else {
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter, doctorFilter, nameFilter]);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'BOOKED': return 'text-primary';
      case 'REVIEWED': return 'text-primary';
      case 'ON-GOING': return 'text-warning';
      case 'ARRIVED': return 'text-success';
      default: return 'text-secondary';
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f5f7fa' }}>
      
      {/* Top Secondary Toolbar */}
      <div className="bg-white border-bottom p-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button className="btn btn-light border p-1" onClick={fetchAppointments}>
            <Search size={18} className="text-danger" style={{ transform: 'rotate(90deg)' }}/>
          </button>
          
          <div className="btn-group border rounded bg-light p-1">
            <CalendarIcon size={18} className="text-muted mx-1" />
            <div className="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center mx-1" style={{width: '20px', height: '20px', fontSize: '12px'}}>*</div>
            <div className="bg-white border rounded-circle text-dark d-flex align-items-center justify-content-center mx-1" style={{width: '20px', height: '20px', fontSize: '12px'}}>Dr</div>
            <input 
              type="text" 
              placeholder="Filter Name" 
              className="border-0 bg-transparent ms-2" 
              style={{ width: '120px', outline: 'none', fontSize: '14px' }}
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>

          <div className="d-flex gap-1 ms-2">
            <button className="btn btn-light border p-1"><Filter size={16} /></button>
            <button className="btn btn-light border p-1"><Search size={16} /></button>
            <button className="btn btn-light border p-1"><Info size={16} /></button>
            <button className="btn btn-light border p-1"><Plus size={16} /></button>
            <button className="btn btn-light border p-1">i</button>
          </div>

          <div className="btn-group ms-3 shadow-sm border rounded">
            {['All', 'Booked', 'Arrived', 'On-Going', 'Reviewed'].map(status => (
              <button 
                key={status}
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-white'}`}
                onClick={() => handleStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
           <div className="d-flex align-items-center border rounded px-2 bg-white">
              <CalendarIcon size={14} className="text-muted me-2" />
              <input 
                type="date" 
                className="border-0" 
                style={{ outline: 'none' }}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
           </div>
           <button className="btn btn-light border btn-sm">Set</button>
           <button className="btn btn-light border btn-sm" onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}>Today</button>
           <button className="btn btn-primary btn-sm ms-2" onClick={() => setShowNewAppt(true)}>+ New Appt</button>
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-grow-1 bg-white p-3 table-responsive">
        <table className="table table-hover align-middle" style={{ minWidth: '900px' }}>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="text-center p-5">Loading...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan="9" className="text-center p-5 text-muted">No appointments found.</td></tr>
            ) : (
              appointments.map(appt => (
                <tr key={appt._id} className="border-bottom">
                  <td className="fw-bold small">{appt.patient?.patientId || '-'}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '28px', height: '28px' }}>
                        <div className="bg-secondary rounded-circle" style={{ width: '10px', height: '10px' }}></div>
                      </div>
                      <span className="fw-bold bg-light px-2 rounded">{appt.patient?.age || '-'}</span>
                    </div>
                  </td>
                  <td 
                    className="fw-bold text-primary" 
                    style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                    onClick={() => setSelectedDashboardPatient(appt.patient)}
                    title="View patient dashboard"
                  >
                    {appt.patient?.name}
                  </td>
                  <td>-</td>
                  <td className="position-relative">
                     <button 
                        className="btn btn-primary btn-sm px-2 py-0 d-flex align-items-center gap-1"
                        onClick={() => setDropdownOpenId(dropdownOpenId === appt._id ? null : appt._id)}
                     >
                        <Info size={14} /> <ChevronDown size={14} />
                     </button>
                     
                     {dropdownOpenId === appt._id && (
                        <div className="position-absolute bg-white shadow-lg rounded py-2 mt-1 border" style={{ zIndex: 9999, width: '200px', left: 0 }}>
                          <div className="dropdown-item d-flex align-items-center gap-3 px-3 py-2 text-dark" style={{ cursor: 'pointer' }} onClick={() => { setSelectedApptForVitals(appt); setDropdownOpenId(null); }}>
                            <Briefcase size={20} className="text-secondary opacity-75" />
                            <span style={{ fontSize: '15px' }}>Vitals</span>
                          </div>
                          <div className="dropdown-item d-flex align-items-center gap-3 px-3 py-2 text-dark" style={{ cursor: 'pointer' }} onClick={() => { setSelectedApptForTestResults(appt); setDropdownOpenId(null); }}>
                            <PlusCircle size={20} className="text-secondary opacity-75" />
                            <span style={{ fontSize: '15px' }}>Test result (new)</span>
                          </div>
                          <div className="dropdown-item d-flex align-items-center gap-3 px-3 py-2 text-dark" style={{ cursor: 'pointer' }} onClick={() => { setSelectedApptForPrescription(appt); setDropdownOpenId(null); }}>
                            <FileText size={20} className="text-secondary opacity-75" />
                            <span style={{ fontSize: '15px' }}>Prescription</span>
                          </div>
                          <div className="dropdown-item d-flex align-items-center gap-3 px-3 py-2 text-dark" style={{ cursor: 'pointer' }} onClick={() => { setSelectedApptForAttachment(appt); setDropdownOpenId(null); }}>
                            <Paperclip size={20} className="text-secondary opacity-75" />
                            <span style={{ fontSize: '15px' }}>Attachments</span>
                          </div>
                        </div>
                     )}

                     {appt.billingStatus !== 'UNPAID' && (
                        <div className="mt-1 d-flex gap-2">
                           <span className="text-primary small d-flex align-items-center"><Printer size={12} className="me-1"/> 800</span>
                        </div>
                     )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-link text-danger text-decoration-none p-0 fw-semibold"
                      onClick={() => {
                        setInitialDashboardTab('Add Bills');
                        setSelectedDashboardPatient(appt.patient);
                        setSelectedDashboardAppointmentId(appt._id);
                      }}
                    >
                      Add Bill
                    </button>
                  </td>
                  <td className="fw-semibold small">{appt.time}</td>
                  <td className={`fw-bold small ${getStatusColor(appt.status)}`}>{appt.status}</td>
                  <td className="small">{appt.doctorName}</td>
                  <td className="small">{appt.service}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNewAppt && (
        <NewAppointmentModal 
          onClose={() => setShowNewAppt(false)} 
          onSuccess={() => {
            setShowNewAppt(false);
            fetchAppointments();
          }}
        />
      )}



      {selectedApptForVitals && (
        <VitalsModal 
          appointment={selectedApptForVitals}
          onClose={() => setSelectedApptForVitals(null)}
          onSuccess={() => {
            setSelectedApptForVitals(null);
            fetchAppointments();
          }}
        />
      )}

      {selectedApptForTestResults && (
        <TestResultModal 
          appointment={selectedApptForTestResults}
          onClose={() => setSelectedApptForTestResults(null)}
          onSuccess={() => {
            setSelectedApptForTestResults(null);
            fetchAppointments();
          }}
        />
      )}

      {selectedApptForPrescription && (
        <PrescriptionModal 
          appointment={selectedApptForPrescription}
          onClose={() => setSelectedApptForPrescription(null)}
        />
      )}

      {selectedApptForAttachment && (
        <AttachmentModal 
          appointment={selectedApptForAttachment}
          onClose={() => setSelectedApptForAttachment(null)}
        />
      )}

      {selectedDashboardPatient && (
        <PatientDashboardModal 
          patient={selectedDashboardPatient}
          initialTab={initialDashboardTab}
          appointmentId={selectedDashboardAppointmentId}
          onClose={() => {
            setSelectedDashboardPatient(null);
            setSelectedDashboardAppointmentId(null);
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;
