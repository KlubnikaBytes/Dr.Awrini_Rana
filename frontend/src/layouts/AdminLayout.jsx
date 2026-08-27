import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AdminLayout.css';

const AdminLayout = () => {
  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#e2e7ec' }}>
      <Navbar />
      
      {/* Secondary Navbar for Admin */}
      <div className="hp-admin-secondary-nav d-flex px-4 align-items-end">
        <NavLink to="/admin/staff" className={({isActive}) => `hp-admin-nav-item ${isActive ? 'active' : ''}`}>Staff</NavLink>
        <NavLink to="/admin/clinics" className={({isActive}) => `hp-admin-nav-item ${isActive ? 'active' : ''}`}>Clinics</NavLink>
        <NavLink to="/admin/preferences" className={({isActive}) => `hp-admin-nav-item ${isActive ? 'active' : ''}`}>Preferences</NavLink>
      </div>

      <div className="flex-grow-1 p-3 hp-admin-content-area">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
