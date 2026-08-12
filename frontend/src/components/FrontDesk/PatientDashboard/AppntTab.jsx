import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { PlusCircle, Edit2 } from 'lucide-react';

const AppntTab = ({ patient, setActiveTab }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        // Assuming we modified getAppointments to take a patientId
        const data = await frontdeskService.getAppointments();
        const patientAppts = data.filter(a => a.patient?.patientId === patient.patientId);
        setAppointments(patientAppts);
      } catch (error) {
        console.error('Error fetching appointments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [patient]);

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5 className="mb-0 fw-bold">Today's Appointments</h5>
        <button className="btn btn-primary d-flex align-items-center gap-2">
          <PlusCircle size={18} /> New Appointment
        </button>
      </div>

      <div className="flex-grow-1 overflow-auto p-3 bg-light">
        {loading ? (
          <div className="text-center text-muted mt-4">Loading...</div>
        ) : (
          <div className="bg-white m-3 rounded border shadow-sm table-responsive">
          <table className="table table-bordered bg-white align-middle mb-0" style={{ minWidth: '600px' }}>
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Service</th>
                <th>Bill</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appt => (
                <tr key={appt._id}>
                  <td>
                    <span className="badge bg-success-subtle text-success px-2 py-1 fs-6 fw-normal">
                      {new Date(appt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                    </span>
                  </td>
                  <td>{appt.time}</td>
                  <td className="text-secondary">{appt.status}</td>
                  <td className="text-secondary">{appt.doctorName}</td>
                  <td className="text-secondary">In-Person</td>
                  <td className="text-secondary">FOLLOW UP CONSULTATION</td>
                  <td>
                    <button 
                      className="btn btn-outline-primary btn-sm px-3 rounded-pill d-flex align-items-center gap-1"
                      onClick={() => setActiveTab && setActiveTab('Add Bills')}
                    >
                      <PlusCircle size={14} /> Add Bill
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-link text-primary p-0">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">No appointments found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppntTab;
