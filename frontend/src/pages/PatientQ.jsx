import React, { useState, useEffect } from 'react';
import frontdeskService from '../services/frontdeskService';
import useWebSocket from '../hooks/useWebSocket';
import { Monitor, Clock, Activity, User, Hash } from 'lucide-react';

const PatientQ = () => {
  const [appointments, setAppointments] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchAppointments = async () => {
    try {
      const data = await frontdeskService.getAppointments();
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    
    // Auto-refresh fallback
    const interval = setInterval(fetchAppointments, 30000); 
    
    // Clock interval
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Proper WebSocket synchronization for live TV queue updates
  useWebSocket((msg) => {
    if (['APPOINTMENT_UPDATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_DELETED', 'QUEUE_UPDATED'].includes(msg.type)) {
      fetchAppointments();
    }
  });

  // Helper to mask patient names securely (e.g., "Mrs. S. Khatun")
  const maskName = (name, gender) => {
    if (!name) return '—';
    const parts = name.trim().split(' ');
    const prefix = gender === 'Male' ? 'Mr.' : (gender === 'Female' ? 'Mrs.' : '');
    
    if (parts.length === 1) return `${prefix} ${parts[0]}`.trim();
    
    const firstInitial = parts[0][0].toUpperCase() + '.';
    const lastName = parts.slice(1).join(' '); // Taking all other parts as last name
    
    return `${prefix} ${firstInitial} ${lastName}`.trim();
  };

  // Filter out cancelled or completed (reviewed) patients
  const activeAppts = appointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'REVIEWED');
  
  // Group by doctor
  const byDoctor = activeAppts.reduce((acc, appt) => {
    const doc = (appt.doctorName || 'General Queue').toUpperCase();
    if (!acc[doc]) acc[doc] = [];
    acc[doc].push(appt);
    return acc;
  }, {});

  // Sort each doctor's queue
  Object.keys(byDoctor).forEach(doc => {
    byDoctor[doc].sort((a, b) => {
      // Prioritize on-going
      if (a.status === 'ON-GOING' && b.status !== 'ON-GOING') return -1;
      if (b.status === 'ON-GOING' && a.status !== 'ON-GOING') return 1;
      
      const qA = a.queueNumber ?? 9999;
      const qB = b.queueNumber ?? 9999;
      if (qA !== qB) return qA - qB;
      
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  });

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', width: '100%', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── TV Header ── */}
      <div style={{ padding: '24px 50px', backgroundColor: '#1e293b', borderBottom: '2px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Monitor size={42} color="#38bdf8" />
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px', lineHeight: 1 }}>PATIENT QUEUE</h1>
            <div style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 600, marginTop: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>Live Display</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#0f172a', padding: '14px 30px', borderRadius: 50, border: '2px solid #334155', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
          <Clock size={28} color="#38bdf8" />
          <span style={{ fontSize: '2.2rem', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── TV Main Content ── */}
      <div style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        {Object.keys(byDoctor).length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
            <Activity size={80} style={{ marginBottom: 24, opacity: 0.3 }} />
            <h2 style={{ fontWeight: 600, fontSize: '2rem' }}>No Patients in Queue</h2>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '50px' }}>
            {Object.entries(byDoctor).map(([docName, queue]) => {
              const serving = queue.filter(a => a.status === 'ON-GOING');
              // If nobody is currently on-going, the first person in the sorted queue is next
              const current = serving.length > 0 ? serving[0] : queue[0];
              // The upcoming list excludes the person currently shown in the "Now Serving" block
              const upcoming = queue.filter(a => a._id !== current?._id).slice(0, 6);

              return (
                <div key={docName} style={{ backgroundColor: '#1e293b', borderRadius: '32px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                  
                  {/* Doctor Banner */}
                  <div style={{ padding: '30px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', textAlign: 'center', borderBottom: '4px solid #0c4a6e' }}>
                    <h2 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '1.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                      {docName}
                    </h2>
                  </div>

                  {/* Now Serving Section */}
                  <div style={{ padding: '50px 40px', textAlign: 'center', borderBottom: '2px solid #334155', backgroundColor: '#0f172a', position: 'relative' }}>
                    
                    {serving.length > 0 && (
                       <div style={{ position: 'absolute', top: 20, right: 30, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></span>
                          <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase' }}>In Cabin</span>
                       </div>
                    )}
                    
                    <div style={{ color: '#38bdf8', fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '24px' }}>
                      {serving.length > 0 ? 'Currently Serving' : 'Next In Line'}
                    </div>
                    
                    {current ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#1e293b', padding: '10px 40px', borderRadius: '20px', border: '2px solid #38bdf8', boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)' }}>
                          <Hash size={40} color="#38bdf8" />
                          <span style={{ fontSize: '6rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>
                            {current.queueNumber}
                          </span>
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#e2e8f0', marginTop: 16 }}>
                          {maskName(current.patient?.name, current.patient?.gender)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', color: '#94a3b8', fontFamily: 'monospace', backgroundColor: '#0f172a', padding: '8px 24px', borderRadius: '12px', border: '1px solid #334155' }}>
                          <User size={24} /> ID: {current.patient?.patientId}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '3rem', color: '#475569', fontWeight: 700, padding: '40px 0' }}>—</div>
                    )}
                  </div>

                  {/* Up Next List */}
                  {upcoming.length > 0 && (
                    <div style={{ padding: '30px 40px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
                        Please Wait (Up Next)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {upcoming.map((appt) => (
                          <div key={appt._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 30px', backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
                              <div style={{ backgroundColor: '#1e293b', width: 80, height: 80, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #475569' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#94a3b8' }}>{appt.queueNumber}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
                                  {maskName(appt.patient?.name, appt.patient?.gender)}
                                </span>
                                <span style={{ fontSize: '1.2rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                                  ID: {appt.patient?.patientId}
                                </span>
                              </div>
                            </div>
                            {appt.time && (
                              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', backgroundColor: '#0c4a6e', padding: '8px 20px', borderRadius: '50px' }}>
                                {appt.time}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientQ;
