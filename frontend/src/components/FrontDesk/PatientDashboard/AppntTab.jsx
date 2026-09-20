import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { PlusCircle, Edit2, X, Receipt, CreditCard } from 'lucide-react';
import NewAppointmentModal from '../../FrontDesk/NewAppointmentModal';
import MergeBillModal from '../../MergeBillModal';

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

const AppntTab = ({ patient, setActiveTab, setActiveApptId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [editAppt, setEditAppt] = useState(null);

  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const totalDueInAppointments = appointments.reduce((sum, appt) => sum + (appt.billSummary && appt.billSummary.billStatus !== 'No Bill' ? appt.billSummary.totalBalance : 0), 0);

  const filteredAppointments = [...appointments].filter(appt => {
    if (dateFrom && new Date(appt.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(appt.date) > new Date(dateTo)) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'desc') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    } else if (sortOrder === 'asc') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    } else {
      // sortOrder === 'updated', keep original order from backend
      return 0;
    }
  });

  const displayAppointments = filteredAppointments;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5 className="mb-0 fw-bold">Appointments History</h5>
        <div className="d-flex align-items-center gap-2">
          {totalDueInAppointments > 0 && (
            <button
              className="btn btn-danger d-flex align-items-center gap-2"
              onClick={() => setShowMergeModal(true)}
            >
              <CreditCard size={18} /> Pay All Dues (₹{totalDueInAppointments.toFixed(2)})
            </button>
          )}
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={handleNewAppt}
          >
            <PlusCircle size={18} /> New Appointment
          </button>
        </div>
      </div>

      <div className="bg-white px-3 py-2 border-bottom d-flex gap-3 align-items-end flex-wrap">
        <div>
          <label className="form-label small fw-bold text-secondary mb-1">From Date</label>
          <input type="date" className="form-control form-control-sm bg-light" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label small fw-bold text-secondary mb-1">To Date</label>
          <input type="date" className="form-control form-control-sm bg-light" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className="form-label small fw-bold text-secondary mb-1">Sort By</label>
          <select className="form-select form-select-sm bg-light" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="desc">Appointment Date (Newest First)</option>
            <option value="asc">Appointment Date (Oldest First)</option>
            <option value="updated">Recently Updated (Default)</option>
          </select>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <button 
            className="btn btn-sm btn-outline-secondary fw-semibold"
            onClick={() => setSortOrder(sortOrder === 'updated' ? 'desc' : 'updated')}
          >
            {sortOrder === 'updated' ? 'Sort by Appointment Date' : 'Sort by Recently Updated'}
          </button>
          {(dateFrom || dateTo || sortOrder !== 'desc') && (
            <button className="btn btn-sm btn-link text-muted text-decoration-none" onClick={() => { setDateFrom(''); setDateTo(''); setSortOrder('desc'); }}>
              Clear Filters
            </button>
          )}
        </div>
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
                <th>Paid</th>
                <th>Due</th>
                <th>Bill</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayAppointments.map(appt => (
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
                  <td className="text-success fw-semibold">
                    {appt.billSummary && appt.billSummary.billStatus !== 'No Bill' ? `₹${appt.billSummary.receivedAmount.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-danger fw-semibold">
                    {appt.billSummary && appt.billSummary.billStatus !== 'No Bill' ? `₹${appt.billSummary.totalBalance.toFixed(2)}` : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-outline-primary btn-sm px-3 rounded-pill d-flex align-items-center gap-1"
                      onClick={() => {
                        if (setActiveApptId) setActiveApptId(appt._id);
                        if (setActiveTab) setActiveTab('Add Bills');
                      }}
                    >
                      {appt.billSummary && appt.billSummary.billStatus !== 'No Bill' ? (
                        <><Receipt size={14} /> View Bill</>
                      ) : (
                        <><PlusCircle size={14} /> Add Bill</>
                      )}
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
              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center text-muted py-4">No appointments found.</td>
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

      {/* Merge & Pay All Dues Modal */}
      {showMergeModal && (
        <MergeBillModal
          show={showMergeModal}
          onClose={() => {
            setShowMergeModal(false);
            fetchAppointments(); // refresh to update paid statuses
          }}
          patientId={patient.patientId}
          patientName={patient.name}
        />
      )}
    </div>
  );
};

export default AppntTab;
