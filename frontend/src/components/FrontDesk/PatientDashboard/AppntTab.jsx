import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { PlusCircle, Edit2, X } from 'lucide-react';
import NewAppointmentModal from '../../FrontDesk/NewAppointmentModal';

// Convert "HH:MM" (24h) → "HH:MM AM/PM" for display. Passes "HH:MM AM/PM" strings through unchanged.
const formatTime = (t) => {
  if (!t) return '—';
  if (t.includes('AM') || t.includes('PM')) return t;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
};

const AppntTab = ({ patient, setActiveTab }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAppt, setEditAppt] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await frontdeskService.getAppointments();
      const patientAppts = data.filter(a => a.patient?.patientId === patient.patientId);
      setAppointments(patientAppts);
    } catch (error) {
      console.error('Error fetching appointments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [patient]);

  const handleNewAppt = () => {
    setEditAppt(null);
    setShowModal(true);
  };

  const handleEditAppt = (appt) => {
    setEditAppt(appt);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditAppt(null);
    fetchAppointments();
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5 className="mb-0 fw-bold">Today's Appointments</h5>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={handleNewAppt}
        >
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
                  <td>{formatTime(appt.time)}</td>
                  <td className="text-secondary">{appt.status}</td>
                  <td className="text-secondary">{appt.doctorName}</td>
                  <td className="text-secondary">In-Person</td>
                  <td className="text-secondary">{appt.service || 'FOLLOW UP CONSULTATION'}</td>
                  <td>
                    <button
                      className="btn btn-outline-primary btn-sm px-3 rounded-pill d-flex align-items-center gap-1"
                      onClick={() => setActiveTab && setActiveTab('Add Bills')}
                    >
                      <PlusCircle size={14} /> Add Bill
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-link text-primary p-0"
                      title="Edit Appointment"
                      onClick={() => handleEditAppt(appt)}
                    >
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

      {/* New / Edit Appointment Modal */}
      {showModal && (
        <NewAppointmentModal
          onClose={() => { setShowModal(false); setEditAppt(null); }}
          onSuccess={handleModalSuccess}
          prefillPatient={patient}
          editData={editAppt}
        />
      )}
    </div>
  );
};

export default AppntTab;
