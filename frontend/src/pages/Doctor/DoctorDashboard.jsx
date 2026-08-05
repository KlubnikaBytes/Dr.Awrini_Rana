import React, { useState, useEffect } from 'react';
import frontdeskService from '../../services/frontdeskService';
import { Search, Plus } from 'lucide-react';
import useSessionState from '../../hooks/useSessionState';

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useSessionState('doctor_searchQuery', '');
  const [selectedDate, setSelectedDate] = useSessionState('doctor_selectedDate', new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await frontdeskService.getAppointments({ date: selectedDate });
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await frontdeskService.updateAppointmentStatus(appointmentId, newStatus);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status', error);
      alert('Failed to update status');
    }
  };

  const pendingCount = appointments.filter(a => a.status !== 'REVIEWED').length;
  const completedCount = appointments.filter(a => a.status === 'REVIEWED').length;

  const filteredAppointments = appointments.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const patientName = app.patient?.name?.toLowerCase() || '';
    const patientId = app.patient?.patientId?.toLowerCase() || '';
    return patientName.includes(q) || patientId.includes(q);
  });

  // Mocking "Wait" calculation
  const calculateWait = (timeStr, status) => {
    if (status === 'REVIEWED' || status === 'BOOKED') return '--';
    return '15m'; // Mock wait time for now
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ON-GOING': return 'text-success fw-bold';
      case 'BOOKED': return 'text-primary fw-bold';
      case 'REVIEWED': return 'text-secondary fw-bold';
      case 'ARRIVED': return 'text-warning fw-bold';
      default: return 'text-dark';
    }
  };

  return (
    <div className="container-fluid p-0 d-flex flex-column" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Banner */}
      <div className="bg-success text-white py-1 px-3 text-center" style={{ fontSize: '0.85rem' }}>
        Scheduled maintenance on Sat(25th July) 10:30 PM-1:00 AM. Please contact support if you face any issues.
      </div>
      
      {/* Toolbar */}
      <div className="bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
             <Search size={16} className="position-absolute top-50 translate-middle-y ms-2 text-secondary" />
             <input 
               type="text" 
               className="form-control form-control-sm ps-4" 
               placeholder="Search Appointments" 
               style={{ width: '200px' }} 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          
          <div className="border rounded px-2 py-1 d-flex gap-3 small align-items-center ms-3 bg-light">
             <div>Pending: <span className="fw-bold">{pendingCount}</span></div>
             <div>Completed: <span className="fw-bold">{completedCount}</span></div>
             <button className="btn btn-outline-primary btn-sm py-0" style={{ fontSize: '0.75rem' }}>Details</button>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input type="date" className="form-control form-control-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <button className="btn btn-primary btn-sm">Set</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>Today</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchAppointments}>Refresh</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="d-flex flex-grow-1 overflow-hidden bg-white">
        {/* Left Table Area */}
        <div className="flex-grow-1 overflow-auto">
          <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
             <thead className="bg-light sticky-top" style={{ zIndex: 1 }}>
               <tr>
                 <th className="text-primary border-bottom-0 py-3 ps-3">ID</th>
                 <th className="text-primary border-bottom-0 py-3">Token</th>
                 <th className="text-primary border-bottom-0 py-3">Patient name</th>
                 <th className="text-primary border-bottom-0 py-3">Visit</th>
                 <th className="text-primary border-bottom-0 py-3">Recent visit</th>
                 <th className="text-primary border-bottom-0 py-3">#Visits</th>
                 <th className="text-primary border-bottom-0 py-3">Time</th>
                 <th className="text-primary border-bottom-0 py-3">Wait</th>
                 <th className="text-primary border-bottom-0 py-3">Status</th>
                 <th className="text-primary border-bottom-0 py-3 pe-3">Purpose</th>
               </tr>
             </thead>
             <tbody>
               {loading && <tr><td colSpan="10" className="text-center py-4">Loading...</td></tr>}
               {!loading && filteredAppointments.length === 0 && <tr><td colSpan="10" className="text-center py-4 text-secondary">No appointments found.</td></tr>}
               {!loading && filteredAppointments.map((app, index) => {
                 const patient = app.patient || {};
                 const patientName = `${patient.name || 'Unknown'}(${patient.age || '--'}Y, ${patient.gender ? patient.gender.charAt(0) : '-'})`;
                 
                 // Use real past visits logic
                 const visits = app.pastVisitsCount || 0;
                 let recentVisit = '--';
                 if (app.recentVisitDate) {
                   const diffTime = Math.abs(new Date() - new Date(app.recentVisitDate));
                   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                   recentVisit = diffDays === 0 ? 'Today' : `${diffDays} days ago`;
                 }
                 
                 return (
                   <tr key={app._id} className="align-middle bg-white border-bottom">
                     <td className="text-secondary ps-3">{patient.patientId || app._id.slice(-6)}</td>
                     <td>
                        <div className="border border-primary text-primary rounded px-2 py-1 text-center d-inline-block" style={{ minWidth: '35px' }}>
                          {index + 1}
                        </div>
                     </td>
                     <td className="fw-semibold text-dark">{patientName}</td>
                     <td>
                       <button className="btn btn-outline-secondary btn-sm py-0" style={{ fontSize: '0.75rem' }} onClick={() => window.location.href = `/doctor/visit/${app._id}`}>Visit Pad</button>
                     </td>
                     <td className="text-secondary">{recentVisit}</td>
                     <td className="text-secondary text-center">{visits}</td>
                     <td className="text-secondary">{app.time}</td>
                     <td className="text-secondary">{calculateWait(app.time, app.status)}</td>
                     <td>
                       <div className="d-flex align-items-center gap-1">
                          <span className={getStatusColor(app.status)}>{app.status}</span>
                          <select 
                            className="form-select border-0 bg-transparent text-secondary p-0 ps-1 shadow-none" 
                            style={{ width: '20px', cursor: 'pointer' }}
                            value={app.status}
                            onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          >
                            <option value="BOOKED">BOOKED</option>
                            <option value="ARRIVED">ARRIVED</option>
                            <option value="ON-GOING">ON-GOING</option>
                            <option value="REVIEWED">REVIEWED</option>
                          </select>
                       </div>
                     </td>
                     <td className="text-secondary pe-3" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.service}({app.doctorName || 'ASW'})
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>

        {/* Right Sidebar - Plix Board */}
        <div className="p-3 bg-light overflow-auto border-start" style={{ width: '350px' }}>
          <div className="bg-white border rounded shadow-sm mb-3">
            {/* Header */}
            <div className="bg-dark text-white px-3 py-2 d-flex justify-content-between align-items-center rounded-top">
               <div className="d-flex align-items-center gap-2">
                  <span className="bg-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '16px', height: '16px' }}><Plus size={12} className="text-white"/></span>
                  <span className="fw-semibold">Plix Board</span>
                  <span className="badge bg-danger rounded-circle">3</span>
               </div>
               <div className="d-flex gap-2">
                 <button className="btn btn-light btn-sm py-0 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>All Updates</button>
               </div>
            </div>
            
            {/* Content */}
            <div className="p-3">
              {/* Robin Dashboard Card */}
              <div className="border rounded p-2 mb-3 bg-white">
                 <div className="d-flex justify-content-between align-items-center mb-2">
                   <span className="fw-semibold small">Robin Dashboard</span>
                 </div>
                 <div className="d-flex gap-2">
                    <div className="border rounded p-2 flex-grow-1 bg-light">
                       <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Patient footfall<br/>(Jul 26 vs Jun 26)</div>
                       <div className="text-success fw-bold fs-5">0%</div>
                    </div>
                    <div className="border rounded p-2 flex-grow-1 bg-light">
                       <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Number of patient in<br/>current month</div>
                       <div className="text-primary fw-bold fs-5">70</div>
                    </div>
                 </div>
              </div>

              {/* Update Card 1 */}
              <div className="border rounded mb-3 bg-white overflow-hidden">
                 <div className="bg-primary text-white px-2 py-1 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                    <span>Front Desk: Send Bills via WhatsApp</span>
                    <span className="bg-warning text-dark px-1 rounded">10 Credits</span>
                 </div>
                 <div className="p-2" style={{ fontSize: '0.8rem' }}>
                    Front desk users can now share patient bills via WhatsApp/SMS from the front desk module.
                 </div>
                 <div className="px-2 pb-2 d-flex justify-content-between align-items-center">
                    <button className="btn btn-outline-primary btn-sm py-0 bg-light" style={{ fontSize: '0.7rem' }}>Watch Video</button>
                 </div>
              </div>

              {/* Update Card 2 */}
              <div className="border rounded mb-3 bg-white overflow-hidden">
                 <div className="bg-primary text-white px-2 py-1 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                    <span>Password Update Policy</span>
                    <span className="bg-warning text-dark px-1 rounded">10 Credits</span>
                 </div>
                 <div className="p-2" style={{ fontSize: '0.8rem' }}>
                    As part of NABH, all HealthPlix users are required to update their login password every 90 days.
                 </div>
                 <div className="px-2 pb-2 d-flex justify-content-between align-items-center">
                    <button className="btn btn-outline-primary btn-sm py-0 bg-light" style={{ fontSize: '0.7rem' }}>Watch Video</button>
                 </div>
              </div>

            </div>
          </div>
          
          {/* Ad Banner */}
          <div className="mt-3 bg-warning text-center fw-bold py-4 rounded d-flex flex-column align-items-center justify-content-center border" style={{minHeight: '150px'}}>
             <span className="text-dark fs-4">Cetaphil</span>
             <span className="text-dark small">Moisturizing Lotion</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
