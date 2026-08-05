import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import useSessionState from '../../../hooks/useSessionState';
import AppntTab from './AppntTab';
import AddBillsTab from './AddBillsTab';
import BillsTab from './BillsTab';
import PaymentsTab from './PaymentsTab';
import VisitsTab from './VisitsTab';
import LabTab from './LabTab';
import ProfileTab from './ProfileTab';

const PatientDashboardModal = ({ patient, appointmentId, onClose, initialTab = 'Appnt' }) => {
  const [activeTab, setActiveTab] = useSessionState('patientDashboard_activeTab', initialTab);

  if (!patient) return null;

  const tabs = [
    { id: 'Appnt', label: 'Appnt' },
    { id: 'Add Bills', label: 'Add Bills' },
    { id: 'Bills', label: 'Bills' },
    { id: 'Payments', label: 'Payments' },
    { id: 'Visits', label: 'Visits' },
    { id: 'Lab', label: 'Lab' },
    { id: 'Profile', label: 'Profile' }
  ];

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content h-100 bg-light d-flex flex-column">
          
          {/* Header */}
          <div className="d-flex flex-wrap align-items-center justify-content-between p-2 gap-2 shadow-sm" style={{ backgroundColor: '#2f3b6c', color: 'white', position: 'relative', zIndex: 9999 }}>
            <div className="d-flex align-items-center gap-3 ps-2">
              <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                <User size={20} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold">{patient.name}</h5>
                <small className="text-white-50">
                  {patient.gender || 'Unknown'} | {patient.age || '?'} Years | {patient.patientId}
                </small>
              </div>
              <button 
                className="btn btn-sm btn-light text-warning fw-bold ms-3" 
                style={{ backgroundColor: '#fff7ed', position: 'relative', zIndex: 10000 }}
                onClick={() => {
                  if (appointmentId) window.open(`/doctor/visit/${appointmentId}`, '_blank');
                  else alert("No active appointment ID available to open Visit Pad");
                }}
              >
                Visit Pad
              </button>
            </div>

            <div className="d-flex align-items-center pe-2" style={{ maxWidth: '100%' }}>
              <div className="d-flex gap-4 me-4 flex-wrap">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTab(tab.id); 
                    }}
                    className="btn text-white p-0 pb-1 rounded-0"
                    style={{ 
                      borderBottom: activeTab === tab.id ? '2px solid white' : '2px solid transparent',
                      opacity: activeTab === tab.id ? 1 : 0.7,
                      fontSize: '15px',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 10000
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="border-start border-secondary mx-2 h-100" style={{ height: '24px' }}></div>
              <button className="btn text-white p-1 ms-2" onClick={onClose} style={{ position: 'relative', zIndex: 10000 }}>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow-1 overflow-auto position-relative bg-white m-2 rounded shadow-sm d-flex flex-column">
            {activeTab === 'Appnt' && <AppntTab patient={patient} />}
            {activeTab === 'Add Bills' && <AddBillsTab patient={patient} />}
            {activeTab === 'Bills' && <BillsTab patient={patient} />}
            {activeTab === 'Payments' && <PaymentsTab patient={patient} />}
            {activeTab === 'Visits' && <VisitsTab patient={patient} />}
            {activeTab === 'Lab' && <LabTab patient={patient} />}
            {activeTab === 'Profile' && <ProfileTab patient={patient} />}
          </div>

          {/* Footer */}
          <div className="bg-white border-top p-2 px-3 d-flex flex-wrap justify-content-between align-items-center text-muted small gap-2">
            <div>Last Payment: 30 days ago (Consultation)</div>
            <div>Registered on: {new Date(patient.createdAt || Date.now()).toLocaleDateString()}</div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDashboardModal;
