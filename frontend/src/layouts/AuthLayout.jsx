import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css'; // We'll create this file

// Import some icons if needed, or use inline SVGs
import { ShieldCheck, CalendarCheck, MessageCircle, Activity } from 'lucide-react'; 

const AuthLayout = () => {
  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-left-panel">
          <div className="auth-marketing-content">
            <h1 className="auth-title">ASR Clinic <span>EMR</span></h1>
            <p className="auth-subtitle">Comprehensive Healthcare Management</p>
          </div>
        </div>
        
        <div className="auth-right-panel">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
