import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SuggestionTab from './Tabs/SuggestionTab';
import MedicineTab from './Tabs/MedicineTab';

const AdminPrescriptionPage = () => {
  return (
    <div className="bg-white rounded shadow-sm hp-admin-card h-100 d-flex flex-column">
      {/* Tertiary Navbar for Prescription */}
      <div className="d-flex border-bottom px-3 pt-2" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <NavLink to="/admin/prescription/complaints" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Complaints</NavLink>
        <NavLink to="/admin/prescription/past-history" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Past History</NavLink>
        <NavLink to="/admin/prescription/physical-exam" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Physical Exam</NavLink>
        <NavLink to="/admin/prescription/diagnosis" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Diagnosis</NavLink>
        <NavLink to="/admin/prescription/medicine" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Medicine</NavLink>
        <NavLink to="/admin/prescription/advice" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Advice</NavLink>
        <NavLink to="/admin/prescription/tests-required" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Tests Required</NavLink>
        <NavLink to="/admin/prescription/history" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Personal History</NavLink>
        <NavLink to="/admin/prescription/past-medication" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Past Medication</NavLink>
      </div>

      {/* Tab Content */}
      <div className="flex-grow-1 overflow-auto bg-light">
        <Routes>
          <Route index element={<Navigate to="medicine" replace />} />
          <Route path="complaints" element={<SuggestionTab type="COMPLAINT" title="Complaints" placeholder="e.g. HEADACHE" />} />
          <Route path="past-history" element={<SuggestionTab type="PAST_HISTORY" title="Past History" placeholder="e.g. DIABETES" />} />
          <Route path="physical-exam" element={<SuggestionTab type="PHYSICAL_EXAM" title="Physical Exam" placeholder="e.g. BP 120/80" />} />
          <Route path="diagnosis" element={<SuggestionTab type="DIAGNOSIS" title="Diagnosis" placeholder="e.g. VIRAL FEVER" />} />
          <Route path="medicine" element={<MedicineTab />} />
          <Route path="advice" element={<SuggestionTab type="ADVICE" title="Advice" placeholder="e.g. DRINK WARM WATER" />} />
          <Route path="tests-required" element={<SuggestionTab type="TEST" title="Tests Required" placeholder="e.g. CBC" />} />
          <Route path="history" element={<SuggestionTab type="PERSONAL_HISTORY" title="Personal History" placeholder="e.g. SMOKER" />} />
          <Route path="past-medication" element={<SuggestionTab type="PAST_MEDICATION" title="Past Medication" placeholder="e.g. AMLODIPINE 5MG" />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPrescriptionPage;
