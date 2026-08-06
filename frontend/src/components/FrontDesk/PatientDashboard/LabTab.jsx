import React, { useState } from 'react';

const LabTab = ({ patient }) => {
  const [activeSubTab, setActiveSubTab] = useState('ASR Clinic Reports');

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* Top Tabs */}
      <div className="d-flex border-bottom px-3 pt-2">
        <button 
          className={`btn border-0 rounded-0 px-2 py-2 fw-bold ${activeSubTab === 'ASR Clinic Reports' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'ASR Clinic Reports' ? '2px solid #0d6efd' : '2px solid transparent' }}
          onClick={() => setActiveSubTab('ASR Clinic Reports')}
        >
          ASR Clinic Reports
        </button>
        <button 
          className={`btn border-0 rounded-0 px-2 py-2 fw-bold ${activeSubTab === 'Uploaded Reports' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'Uploaded Reports' ? '2px solid #0d6efd' : '2px solid transparent' }}
          onClick={() => setActiveSubTab('Uploaded Reports')}
        >
          Uploaded Reports
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow-1 p-4 d-flex align-items-center justify-content-center bg-light">
        {activeSubTab === 'ASR Clinic Reports' ? (
          <div className="text-center">
            <h6 className="fw-bold text-secondary mb-5">Lab reports of ASR Clinic</h6>
            <div className="flex-grow-1 d-flex justify-content-center align-items-center">
              <h5 className="text-black-50 fw-normal">These are no Reports for the Patient</h5>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h6 className="fw-bold text-secondary mb-5">Uploaded Lab Reports</h6>
            <div className="flex-grow-1 d-flex justify-content-center align-items-center">
              <h5 className="text-black-50 fw-normal">No uploaded reports found</h5>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTab;
