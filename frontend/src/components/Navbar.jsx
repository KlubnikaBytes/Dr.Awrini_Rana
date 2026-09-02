import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Grid, Receipt, FileText, Users, MonitorPlay,
  Stethoscope, Monitor, UserCog, Microscope, FileSpreadsheet, Home, Sun,
  LogOut, User, ChevronDown, Plus, X, Bell
} from 'lucide-react';
import frontdeskService from '../services/frontdeskService';
import { useWS } from '../context/WebSocketContext';
import GlobalPatientSearch from './GlobalPatientSearch';

const Navbar = () => {
  const [isGridOpen, setIsGridOpen]       = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isMobileOpen, setIsMobileOpen]   = useState(false);
  const [wsConnected, setWsConnected]     = useState(false);
  const gridRef    = useRef(null);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);
  const navigate   = useNavigate();
  const { isConnected, subscribe } = useWS();

  // Poll WS connection status
  useEffect(() => {
    const id = setInterval(() => setWsConnected(isConnected()), 2000);
    return () => clearInterval(id);
  }, [isConnected]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await frontdeskService.getUpcomingNotifications();
        setNotifications(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotifs();
    // Refresh notifications every 5 mins
    const interval = setInterval(fetchNotifs, 300000);
    return () => clearInterval(interval);
  }, []);

  // Set initial status after first connected event
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
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const gridItems = [
    { name: 'Doctor',    icon: <Stethoscope size={20} style={{ color: '#2563eb' }} />,   link: '/doctor' },
    { name: 'Frontdesk', icon: <Monitor size={20}     style={{ color: '#0891b2' }} />,   link: '/' },
    { name: 'Admin',     icon: <UserCog size={20}     style={{ color: '#d977a5' }} />,   link: '/admin' },
    { name: 'Lab',       icon: <Microscope size={20}  style={{ color: '#7c3aed' }} />,   link: '/lab' },
    { name: 'Day Care',  icon: <Sun size={20}         style={{ color: '#f59e0b' }} />,   link: '/day-care' },
    { name: 'Reports',   icon: <FileSpreadsheet size={20} style={{ color: '#64748b' }} />, link: '/reports' },
    { name: 'Home Care', icon: <Home size={20}        style={{ color: '#10b981' }} />,   link: '/home-care' },
  ];

  const navLinks = [
    { to: '/',            icon: <Receipt size={14} />,     label: 'Front Desk',  end: true },
    { to: '/queue',       icon: <Users size={14} />,       label: 'Queue' },
    { to: '/add-services',icon: <FileText size={14} />,    label: 'Add Services' },
  ];

  return (
    <nav className="hp-navbar d-flex align-items-center justify-content-between px-3" style={{ flexShrink: 0 }}>
      {/* Left — Logo + Nav links */}
      <div className="d-flex align-items-center h-100 gap-3">
        <div className="hp-logo d-flex align-items-center gap-2">
          <div className="hp-logo-icon">
            <Plus size={16} color="white" strokeWidth={3} />
          </div>
          <div className="hp-logo-text" onClick={() => navigate('/select-clinic')} style={{ cursor: 'pointer' }} title="Click to switch clinic">
            <div className="clinic-name">{localStorage.getItem('clinicName') || 'Select Clinic'}</div>
            <div className="clinic-badge">PRO</div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="hp-nav-links mobile-hide">
          {navLinks.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `hp-nav-item ${isActive ? 'active' : ''}`}>
              {icon}
              <span style={{ marginLeft: 5 }}>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="d-flex align-items-center gap-2">
        {/* WS Status */}
        <div
          className="d-flex align-items-center gap-1"
          title={wsConnected ? 'Live sync active' : 'Connecting...'}
          style={{ cursor: 'default' }}
        >
          <div className={`ws-dot ${wsConnected ? '' : 'disconnected'}`} />
          <span className="mobile-hide" style={{ fontSize: '0.68rem', color: wsConnected ? 'rgba(255,255,255,0.6)' : '#f87171' }}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Search */}
        <div className="hp-search-container mobile-hide">
          <GlobalPatientSearch />
        </div>

        {/* Notifications */}
        <div className="hp-action-icon position-relative" ref={notifRef} onClick={() => setIsNotifOpen(!isNotifOpen)} title="Upcoming Follow-ups">
          <Bell size={18} />
          {notifications.length > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '0.25em 0.4em' }}>
              {notifications.length}
            </span>
          )}
          {isNotifOpen && (
            <div className="hp-grid-dropdown fade-in p-0 text-dark text-start shadow-lg" style={{ width: '300px', cursor: 'default', right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="bg-light border-bottom p-2 fw-bold text-secondary d-flex justify-content-between align-items-center">
                <span>Upcoming Follow-ups (3 Days)</span>
                <span className="badge bg-primary rounded-pill">{notifications.length}</span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No upcoming follow-ups.</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className="p-3 border-bottom hover-bg-light" style={{ cursor: 'pointer' }} onClick={() => { setIsNotifOpen(false); /* Optionally navigate to patient dashboard */ }}>
                      <div className="fw-bold text-primary mb-1">{notif.patient?.name || 'Unknown Patient'} <span className="text-muted fw-normal" style={{ fontSize: '0.8rem' }}>({notif.patient?.patientId})</span></div>
                      <div className="d-flex justify-content-between align-items-center small text-secondary">
                        <div className="d-flex align-items-center gap-1">
                          <Stethoscope size={12} /> Dr. {notif.doctorName}
                        </div>
                        <div className="d-flex align-items-center gap-1 text-danger fw-semibold">
                          <Receipt size={12} /> {new Date(notif.date).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Module Grid */}
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
        <div className="hp-action-icon position-relative" ref={profileRef} title="Profile" style={{ background: 'rgba(255,255,255,0.12)' }} onClick={() => setIsProfileOpen(!isProfileOpen)}>
          <User size={16} />
          {isProfileOpen && (
            <div className="hp-grid-dropdown fade-in p-3 text-dark text-start" style={{ width: '200px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
                  <User size={18} className="text-white" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div className="fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>{user.name || 'Admin User'}</div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>{user.role || 'Super Admin'}</div>
                </div>
              </div>
              <hr className="my-2" />
              <div className="text-muted text-truncate mb-1" style={{ fontSize: '0.75rem' }}><FileText size={12} className="me-1" /> ID: {user.staffId || 'N/A'}</div>
              <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>📧 {user.email || 'N/A'}</div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="hp-action-icon" title="Logout" onClick={handleLogout} style={{ color: '#fca5a5' }}>
          <LogOut size={16} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
