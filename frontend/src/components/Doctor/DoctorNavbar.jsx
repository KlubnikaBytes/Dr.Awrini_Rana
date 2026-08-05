import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Search, Grid, Plus, UserPlus, Headset, Bell, User,
  Stethoscope, Monitor, UserCog, Microscope, Bed, FileSpreadsheet, Pill, Activity, LogOut, Settings
} from 'lucide-react';
import '../Navbar.css'; // We can reuse the same CSS for styling

const DoctorNavbar = () => {
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const gridRef = useRef(null);
  const optionsRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gridRef.current && !gridRef.current.contains(event.target)) {
        setIsGridOpen(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const gridItems = [
    { name: 'Doctor', icon: <Stethoscope size={24} className="mb-1 text-primary" />, link: '/doctor' },
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
            <span className="fw-bold text-white small">HealthPlix</span>
            <span className="badge bg-secondary text-white mt-1" style={{ fontSize: '0.6rem' }}>Pro</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hp-nav-links d-flex h-100 align-items-center">
          <NavLink to="/doctor" end className="hp-nav-item d-flex align-items-center px-3 text-decoration-none h-100 text-white fw-semibold" style={{fontSize: '0.9rem'}}>
            Appointments
          </NavLink>

          <NavLink to="/doctor/consults" className="hp-nav-item d-flex align-items-center px-3 text-decoration-none h-100 fw-semibold" style={{fontSize: '0.9rem', color: '#a0a6cc'}}>
            Consults
          </NavLink>

          <div className="position-relative h-100 d-flex align-items-center" ref={optionsRef}>
            <div 
              className="hp-nav-item d-flex align-items-center px-3 h-100 fw-semibold" 
              style={{fontSize: '0.9rem', cursor: 'pointer', color: '#a0a6cc'}}
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            >
              Options ▾
            </div>
            {isOptionsOpen && (
              <div className="position-absolute bg-white shadow rounded py-2" style={{top: '100%', left: 0, minWidth: '150px', zIndex: 1000}}>
                 <div className="dropdown-item px-3 py-1" style={{cursor: 'pointer'}}>Option 1</div>
                 <div className="dropdown-item px-3 py-1" style={{cursor: 'pointer'}}>Option 2</div>
              </div>
            )}
          </div>
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
        
        <div className="hp-action-icon me-4" style={{ cursor: 'pointer' }}>
          <Bell size={20} className="text-white" />
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

        <div className="hp-profile-icon bg-warning rounded-circle d-flex align-items-center justify-content-center me-4" style={{ width: '32px', height: '32px', cursor: 'pointer' }}>
          <User size={20} className="text-dark" />
        </div>
      </div>
    </nav>
  );
};

export default DoctorNavbar;
