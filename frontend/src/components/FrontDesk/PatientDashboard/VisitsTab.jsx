import React, { useState, useEffect } from 'react';
import frontdeskService from '../../../services/frontdeskService';
import { Printer, Share2 } from 'lucide-react';

const VisitsTab = ({ patient }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        setLoading(true);
        // Using appointments as visits for now
        const data = await frontdeskService.getAppointments();
        const patientVisits = data.filter(a => a.patient?.patientId === patient.patientId);
        setVisits(patientVisits);
      } catch (error) {
        console.error('Error fetching visits', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, [patient]);

  return (
    <div className="d-flex flex-column h-100 bg-white">
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
        <h5 className="mb-0 fw-bold text-secondary">Past Visits</h5>
        <button className="btn btn-primary btn-sm px-3 fw-bold rounded">
          Go to IPD
        </button>
      </div>

      <div className="flex-grow-1 p-3 overflow-auto">
        {loading ? (
          <div className="text-center mt-4">Loading...</div>
        ) : (
          <div className="rounded border shadow-sm table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: '600px' }}>
              <thead className="table-light">
                <tr>
                  <th className="py-3">Date</th>
                  <th>Doctor</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Prescription</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(visit => (
                  <tr key={visit._id}>
                    <td>{new Date(visit.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</td>
                    <td className="text-secondary">{visit.doctorName}</td>
                    <td className="text-secondary">In-Person</td>
                    <td className="text-secondary text-uppercase">{visit.status === 'BOOKED' ? 'FIRST CONSULTATION' : 'FOLLOW UP CONSULTATION'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill px-3">
                          <Printer size={14} /> Print
                        </button>
                        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill px-3">
                          <Share2 size={14} /> Share
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">No past visits found for this patient.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="d-flex justify-content-between p-3 text-muted small border-top">
              <span>1 — {visits.length} of {visits.length} results</span>
              <span>End of List</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitsTab;
