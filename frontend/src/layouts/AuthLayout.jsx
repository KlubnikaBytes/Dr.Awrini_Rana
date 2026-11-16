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
            <h1 className="auth-title">mediplix <span>EMR</span></h1>
            <p className="auth-subtitle mb-4">
              Advanced Healthcare Management System
              <span className="d-block mt-1" style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>
                Designed and managed by <strong style={{ color: '#38bdf8', fontWeight: 600 }}>Klubnika Bytes(KB)</strong>
              </span>
            </p>

            <div className="auth-features">
              <div className="feature-item">
                <div className="feature-icon bg-blue-light"><ShieldCheck size={24} /></div>
                <div>
                  <h4 style={{ color: 'white', margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>Secure Patient Records</h4>
                  <p>End-to-end encrypted health data management</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon bg-green-light"><CalendarCheck size={24} /></div>
                <div>
                  <h4 style={{ color: 'white', margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>Smart Scheduling</h4>
                  <p>Automated appointments and queue management</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon bg-orange-light"><Activity size={24} /></div>
                <div>
                  <h4 style={{ color: 'white', margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>Integrated Billing</h4>
                  <p>Seamless invoicing and insurance tracking</p>
                </div>
              </div>
            </div>
            
            <div className="auth-footer-info">
              <div>
                <div>© {new Date().getFullYear()} mediplix</div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px', fontWeight: 400 }}>
                  Designed and managed by <span style={{ color: '#38bdf8', fontWeight: 600 }}>Klubnika Bytes(KB)</span>
                </div>
              </div>
              <span>Need help? Contact Support</span>
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
