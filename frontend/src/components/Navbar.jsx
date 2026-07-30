import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Search, Grid, Plus, UserPlus, Headset, Receipt, FileText, Users, MonitorPlay, User,
  Stethoscope, Monitor, UserCog, Microscope, Bed, FileSpreadsheet, Pill, Activity, LogOut
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isGridOpen, setIsGridOpen] = useState(false);
  const gridRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Close grid dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gridRef.current && !gridRef.current.contains(event.target)) {
        setIsGridOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const gridItems = [
    { name: 'Doctor', icon: <Stethoscope size={24} className="mb-1 text-primary" /> },
    { name: 'Frontdesk', icon: <Monitor size={24} className="mb-1 text-info" />, link: '/' },
    { name: 'Admin', icon: <UserCog size={24} className="mb-1" style={{ color: '#d977a5' }} />, link: '/admin' },
    { name: 'Lab', icon: <Microscope size={24} className="mb-1 text-primary" /> },
    { name: 'IPD', icon: <Bed size={24} className="mb-1 text-success" /> },
    { name: 'Reports', icon: <FileSpreadsheet size={24} className="mb-1 text-secondary" /> },
    { name: 'Pharmacy', icon: <Pill size={24} className="mb-1 text-warning" /> },
    { name: 'Robin', icon: <Activity size={24} className="mb-1" style={{ color: '#f06c6c' }} /> },
  ];

  return (
    <nav className="hp-navbar d-flex align-items-center justify-content-between px-3">
      {/* Left side */}
      <div className="d-flex align-items-center h-100">
        {/* Logo Area */}
        <div className="hp-logo d-flex align-items-center me-4">
          <div className="logo-icon bg-success rounded-circle d-flex align-items-center justify-content-center me-2">
            <Plus size={16} color="white" />
          </div>
          <div className="logo-text d-flex flex-column lh-1">
            <span className="fw-bold text-white small">Dr Aswini Rana Clinic</span>
            <span className="badge bg-secondary text-white mt-1" style={{ fontSize: '0.6rem' }}>Pro</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hp-nav-links d-flex h-100">
          <NavLink to="/" className="hp-nav-item d-flex flex-column align-items-center justify-content-center px-3 text-decoration-none">
            <Receipt size={18} className="mb-1" />
            <span style={{ fontSize: '0.8rem' }} className="fw-semibold">All Bills</span>
          </NavLink>

          <NavLink to="/add-services" className="hp-nav-item d-flex flex-column align-items-center justify-content-center px-3 text-decoration-none">
            <FileText size={18} className="mb-1" />
            <span style={{ fontSize: '0.8rem' }} className="fw-semibold">Add Services</span>
          </NavLink>

          <NavLink to="/patient-q" className="hp-nav-item d-flex flex-column align-items-center justify-content-center px-3 text-decoration-none">
            <Users size={18} className="mb-1" />
            <span style={{ fontSize: '0.8rem' }} className="fw-semibold">Patient Q</span>
          </NavLink>

          <NavLink to="/teleconsults" className="hp-nav-item d-flex flex-column align-items-center justify-content-center px-3 text-decoration-none">
            <MonitorPlay size={18} className="mb-1" />
            <span style={{ fontSize: '0.8rem' }} className="fw-semibold">Tele Consults</span>
          </NavLink>
        </div>
      </div>

      {/* Right side */}
      <div className="d-flex align-items-center h-100 hp-right-menu">
        <div className="hp-action-item d-flex flex-column align-items-center justify-content-center me-4" style={{ cursor: 'pointer' }}>
          <UserPlus size={18} className="mb-1 text-white" />
          <span style={{ fontSize: '0.75rem' }} className="text-white">New</span>
        </div>

        <div className="hp-search-container position-relative me-4">
          <input 
            type="text" 
            placeholder="Search Patient" 
            className="hp-search-input form-control rounded-pill border-0 text-white ps-3 pe-5"
          />
          <Search size={16} className="hp-search-icon position-absolute top-50 translate-middle-y end-0 me-3 text-info" />
        </div>

        <div className="hp-action-item d-flex flex-column align-items-center justify-content-center me-4" style={{ cursor: 'pointer' }}>
          <Headset size={18} className="mb-1 text-white" />
          <span style={{ fontSize: '0.75rem' }} className="text-white">Support</span>
        </div>

        <div className="hp-action-icon me-4 position-relative" ref={gridRef}>
          <div style={{ cursor: 'pointer' }} onClick={() => setIsGridOpen(!isGridOpen)}>
            <Grid size={22} className="text-white" />
          </div>

        {/* Grid Dropdown Menu */}
          {isGridOpen && (
            <div className="hp-grid-dropdown position-absolute bg-light rounded shadow-sm d-flex gap-2">
              {gridItems.map((item, index) => {
                const ItemContent = (
                  <div className="hp-grid-item d-flex flex-column align-items-center justify-content-center bg-white rounded">
                    {item.icon}
                    <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{item.name}</span>
                  </div>
                );
                
                return item.link ? (
                  <NavLink to={item.link} key={index} className="text-decoration-none" onClick={() => setIsGridOpen(false)}>
                    {ItemContent}
                  </NavLink>
                ) : (
                  <div key={index}>
                    {ItemContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hp-profile-icon bg-warning rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', cursor: 'pointer' }}>
          <User size={20} className="text-dark" />
        </div>

        <div className="hp-action-item d-flex flex-column align-items-center justify-content-center" style={{ cursor: 'pointer' }} onClick={handleLogout}>
          <LogOut size={18} className="mb-1 text-white" />
          <span style={{ fontSize: '0.75rem' }} className="text-white">Logout</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
