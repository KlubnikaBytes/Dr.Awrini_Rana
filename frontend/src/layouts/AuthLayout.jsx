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
            <h1 className="auth-title">Dr Aswini Rana Clinic is <span>India's largest EMR</span></h1>
            <p className="auth-subtitle">Trusted by 14,000+ doctors across 16 specialties</p>
            
            <div className="auth-features">
              <div className="feature-item">
                <div className="feature-icon bg-orange-light">
                  <ShieldCheck size={24} />
                </div>
                <p>Write Generic / Branded prescriptions, comply seamlessly with NMC guidelines</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon bg-blue-light">
                  <CalendarCheck size={24} />
                </div>
                <p>Refer & Earn up to ₹60,000</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon bg-green-light">
                  <MessageCircle size={24} />
                </div>
                <p>Start Patient Engagement on WhatsApp, with a masked number!</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon bg-red-light">
                  <Activity size={24} />
                </div>
                <p>DDI - Proactive nudges on medicine interactions</p>
              </div>
            </div>
            
            <div className="auth-footer-info">
              <span>Need help? Call us @1800 1020 127</span>
              <span>T&C apply*</span>
            </div>
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
