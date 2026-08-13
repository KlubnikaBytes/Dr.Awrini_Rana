import React, { useState, useEffect } from 'react';
import frontdeskService from '../services/frontdeskService';

const PatientQ = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await frontdeskService.getAppointments();
        // Assuming we want today's appointments, we could filter here, 
        // but for demo we will show all returned appointments.
        setAppointments(data || []);
      } catch (error) {
        console.error('Error fetching appointments', error);
      }
    };

    fetchAppointments();
    
    // Optional: Auto-refresh every 30 seconds for a live queue
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ backgroundColor: '#23866d', minHeight: '100vh', width: '100%', padding: '20px' }}>
      <div style={{ border: '1px solid #4eb59f', borderRadius: '2px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', fontFamily: 'sans-serif' }}>
          <thead>
            <tr>
              <th style={{ padding: '15px 20px', textAlign: 'left', borderRight: '1px solid #4eb59f', fontSize: '24px', width: '12%' }}>Token</th>
              <th style={{ padding: '15px 20px', textAlign: 'left', borderRight: '1px solid #4eb59f', fontSize: '24px', width: '15%' }}>Appt Time</th>
              <th style={{ padding: '15px 20px', textAlign: 'left', borderRight: '1px solid #4eb59f', fontSize: '24px', width: '30%' }}>Patient Name</th>
              <th style={{ padding: '15px 20px', textAlign: 'left', borderRight: '1px solid #4eb59f', fontSize: '24px', width: '15%' }}>P ID</th>
              <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '24px' }}>Doctor</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt, idx) => (
              <tr key={appt._id} style={{ borderTop: '1px solid #4eb59f' }}>
                <td style={{ padding: '15px 20px', borderRight: '1px solid #4eb59f', fontSize: '20px' }}>{idx + 1}</td>
                <td style={{ padding: '15px 20px', borderRight: '1px solid #4eb59f', fontSize: '20px' }}>
                  {appt.time || new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '15px 20px', borderRight: '1px solid #4eb59f', fontSize: '20px' }}>{appt.patient?.name?.toUpperCase()}</td>
                <td style={{ padding: '15px 20px', borderRight: '1px solid #4eb59f', fontSize: '20px' }}>{appt.patient?.patientId}</td>
                <td style={{ padding: '15px 20px', fontSize: '20px' }}>{appt.doctorName?.toUpperCase()}</td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr style={{ borderTop: '1px solid #4eb59f' }}>
                <td colSpan="5" style={{ padding: '30px 20px', textAlign: 'center', fontSize: '20px' }}>
                  No patients in queue
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientQ;
