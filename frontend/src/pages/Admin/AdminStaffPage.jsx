import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import StaffTab from './Tabs/StaffTab';
import ReferralDoctorsTab from './Tabs/ReferralDoctorsTab';
import VendorsTab from './Tabs/VendorsTab';
import './AdminStaffPage.css';

const AdminStaffPage = () => {
  return (
    <div className="bg-white rounded shadow-sm hp-admin-card h-100 d-flex flex-column">
      {/* Tertiary Navbar */}
      <div className="d-flex border-bottom px-3 pt-2">
        <NavLink to="/admin/staff/list" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Staff</NavLink>
        <NavLink to="/admin/staff/referral-doctors" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Referral Doctors</NavLink>
        <NavLink to="/admin/staff/vendors" className={({isActive}) => `hp-tertiary-nav-item ${isActive ? 'active' : ''}`}>Vendors</NavLink>
      </div>

      {/* Tab Content */}
      <div className="flex-grow-1 overflow-auto bg-light">
        <Routes>
          <Route index element={<Navigate to="list" replace />} />
          <Route path="list" element={<StaffTab />} />
          <Route path="referral-doctors" element={<ReferralDoctorsTab />} />
          <Route path="vendors" element={<VendorsTab />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminStaffPage;
