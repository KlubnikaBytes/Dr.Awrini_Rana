import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search, Grid, Plus, Stethoscope, Monitor, UserCog,
  Microscope, FileSpreadsheet, Home, Sun, LogOut, User
} from 'lucide-react';
import { useWS } from '../../context/WebSocketContext';
import '../Navbar.css';

const DoctorNavbar = () => {
  const [isGridOpen, setIsGridOpen]   = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const gridRef  = useRef(null);
  const navigate = useNavigate();
  const { isConnected, subscribe } = useWS();

  useEffect(() => {
    const id = setInterval(() => setWsConnected(isConnected()), 2000);
    return () => clearInterval(id);
  }, [isConnected]);

  useEffect(() => {
    const unsub = subscribe('CONNECTED', () => setWsConnected(true));
    return unsub;
  }, [subscribe]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gridRef.current && !gridRef.current.contains(e.target)) setIsGridOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const gridItems = [
    { name: 'Doctor',    icon: <Stethoscope size={20} style={{ color: '#2563eb' }} />,      link: '/doctor' },
    { name: 'Frontdesk', icon: <Monitor size={20}     style={{ color: '#0891b2' }} />,      link: '/' },
    { name: 'Admin',     icon: <UserCog size={20}     style={{ color: '#d977a5' }} />,      link: '/admin' },
    { name: 'Lab',       icon: <Microscope size={20}  style={{ color: '#7c3aed' }} />,      link: '/lab' },
    { name: 'Day Care',  icon: <Sun size={20}         style={{ color: '#f59e0b' }} />,      link: '/day-care' },
    { name: 'Reports',   icon: <FileSpreadsheet size={20} style={{ color: '#64748b' }} />,  link: '/reports' },
    { name: 'Home Care', icon: <Home size={20}        style={{ color: '#10b981' }} />,      link: '/home-care' },
  ];

  return (
    <nav className="hp-navbar d-flex align-items-center justify-content-between px-3" style={{ flexShrink: 0 }}>
      {/* Left — Logo + Nav */}
      <div className="d-flex align-items-center h-100 gap-3">
        <div className="hp-logo d-flex align-items-center gap-2">
          <div className="hp-logo-icon">
            <Plus size={16} color="white" strokeWidth={3} />
          </div>
          <div className="hp-logo-text" onClick={() => navigate('/select-clinic')} style={{ cursor: 'pointer' }} title="Click to switch clinic">
            <div className="clinic-name">{localStorage.getItem('clinicName') || 'Select Clinic'}</div>
            <div className="clinic-badge">DOCTOR</div>
          </div>
        </div>

        <div className="hp-nav-links mobile-hide">
          <NavLink
            to="/doctor" end
            className={({ isActive }) => `hp-nav-item ${isActive ? 'active' : ''}`}
          >
            <Stethoscope size={14} />
            <span style={{ marginLeft: 5 }}>Appointments</span>
          </NavLink>
        </div>
      </div>

      {/* Right */}
      <div className="d-flex align-items-center gap-2">
        {/* WS Status */}
        <div
          className="d-flex align-items-center gap-1"
          title={wsConnected ? 'Live sync active' : 'Connecting...'}
        >
          <div className={`ws-dot ${wsConnected ? '' : 'disconnected'}`} />
          <span className="mobile-hide" style={{ fontSize: '0.68rem', color: wsConnected ? 'rgba(255,255,255,0.6)' : '#f87171' }}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Search */}
        <div className="hp-search-container mobile-hide">
          <input type="text" placeholder="Search patient..." className="hp-search-input" />
          <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
        </div>

        {/* Module switcher */}
        <div className="hp-action-icon position-relative" ref={gridRef} onClick={() => setIsGridOpen(!isGridOpen)} title="Switch module">
          <Grid size={18} />
          {isGridOpen && (
            <div className="hp-grid-dropdown fade-in">
              {gridItems.map((item) => (
                <NavLink key={item.name} to={item.link} className="hp-grid-item" onClick={() => setIsGridOpen(false)}>
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="hp-action-icon" style={{ background: 'rgba(255,255,255,0.12)' }} title="Profile">
          <User size={16} />
        </div>

        {/* Logout */}
        <div className="hp-action-icon" title="Logout" onClick={handleLogout} style={{ color: '#fca5a5' }}>
          <LogOut size={16} />
        </div>
      </div>
    </nav>
  );
};

export default DoctorNavbar;
