import React, { useState } from 'react';

const LabTab = ({ patient }) => {
  const [activeSubTab, setActiveSubTab] = useState('Dr Aswini Rana Clinic Reports');

  return (
    <div className="d-flex flex-column h-100 bg-white">
      <div className="d-flex border-bottom ps-3 pt-3 gap-4">
        <button 
          className={`btn border-0 rounded-0 px-2 py-2 fw-bold ${activeSubTab === 'Dr Aswini Rana Clinic Reports' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'Dr Aswini Rana Clinic Reports' ? '2px solid #0d6efd' : '2px solid transparent' }}
          onClick={() => setActiveSubTab('Dr Aswini Rana Clinic Reports')}
        >
          Dr Aswini Rana Clinic Reports
        </button>
      </div>

      <div className="flex-grow-1 p-4 d-flex flex-column">
        <h6 className="fw-bold text-secondary mb-5">Lab reports of Dr Aswini Rana Clinic</h6>
        
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <h5 className="text-black-50 fw-normal">These are no Reports for the Patient</h5>
        </div>
      </div>
    </div>
  );
};

export default LabTab;
