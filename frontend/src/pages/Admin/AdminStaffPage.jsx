import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import StaffTab from './Tabs/StaffTab';
import DoctorsTab from './Tabs/DoctorsTab';
import ReferralDoctorsTab from './Tabs/ReferralDoctorsTab';
import VendorsTab from './Tabs/VendorsTab';
import LabTestsTab from './Tabs/LabTestsTab';
import TieUpOrgsTab from './Tabs/TieUpOrgsTab';
import ServicesTab from './Tabs/ServicesTab';
import './AdminStaffPage.css';

const AdminStaffPage = () => {
  return (
    <div className="bg-white rounded shadow-sm hp-admin-card h-100 d-flex flex-column">
      {/* Tertiary Navbar */}
      <div className="d-flex border-bottom px-3 pt-2">
        <NavLink to="/admin/staff/doctors" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>🩺 Doctors</NavLink>
        <NavLink to="/admin/staff/list" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Staff</NavLink>
        <NavLink to="/admin/staff/referral-doctors" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Referral Doctors</NavLink>
        <NavLink to="/admin/staff/vendors" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Vendors</NavLink>
        <NavLink to="/admin/staff/lab-tests" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Lab Tests Catalog</NavLink>
        <NavLink to="/admin/staff/tie-up-orgs" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Tie-Up Orgs</NavLink>
        <NavLink to="/admin/staff/services" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Services</NavLink>
      </div>

      {/* Tab Content */}
      <div className="flex-grow-1 overflow-auto bg-light">
        <Routes>
          <Route index element={<Navigate to="doctors" replace />} />
          <Route path="doctors" element={<DoctorsTab />} />
          <Route path="list" element={<StaffTab />} />
          <Route path="referral-doctors" element={<ReferralDoctorsTab />} />
          <Route path="vendors" element={<VendorsTab />} />
          <Route path="lab-tests" element={<LabTestsTab />} />
          <Route path="tie-up-orgs" element={<TieUpOrgsTab />} />
          <Route path="services" element={<ServicesTab />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminStaffPage;
