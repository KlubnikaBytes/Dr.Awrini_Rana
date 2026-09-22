import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity, Stethoscope, UserCog } from 'lucide-react';
import axios from 'axios';
import { decodeJwtPayload } from '../../services/authToken';

const Login = () => {
  const [mode, setMode] = useState('admin'); // 'admin' | 'doctor'
  const [showPassword, setShowPassword] = useState(false);

  // Admin/staff login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Doctor portal login fields
  const [doctorLoginId, setDoctorLoginId] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email,
        password
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/select-clinic');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/doctor-login`, {
        doctorLoginId: doctorLoginId.trim(),
        password: doctorPassword
      });

      const { doctorToken } = response.data;

      // Store ONLY the JWT token — doctor credentials stay in DB.
      // Identity (name, designation) is fetched live from /api/auth/doctor-me on each page load.
      localStorage.setItem('doctorToken', doctorToken);

      // Extract clinicId from the JWT payload so API calls can send x-clinic-id header.
      // The server still verifies the JWT signature on every authenticated request.
      const payload = decodeJwtPayload(doctorToken);
      if (payload?.clinicId) {
        localStorage.setItem('clinicId', payload.clinicId);
      }

      // Go straight to doctor portal — no clinic selection screen
      navigate('/doctor');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Doctor ID or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-logo">
        <h2>
          <Activity className="auth-logo-icon" /> mediplix
        </h2>
      </div>

      {/* Mode Toggle */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: '1.5rem',
        background: '#f1f5f9', borderRadius: 10, padding: 4
      }}>
        <button
          type="button"
          onClick={() => { setMode('admin'); setError(''); }}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
            background: mode === 'admin' ? '#fff' : 'transparent',
            color: mode === 'admin' ? '#1d4ed8' : '#64748b',
            boxShadow: mode === 'admin' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          <UserCog size={14} /> Admin / Staff
        </button>
        <button
          type="button"
          onClick={() => { setMode('doctor'); setError(''); }}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
            background: mode === 'doctor' ? '#fff' : 'transparent',
            color: mode === 'doctor' ? '#7c3aed' : '#64748b',
            boxShadow: mode === 'doctor' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          <Stethoscope size={14} /> Doctor Portal
        </button>
      </div>

      <h3 className="form-title">
        {mode === 'admin' ? 'Sign in' : 'Doctor Sign in'}
      </h3>
      <p className="form-subtitle">
        {mode === 'admin'
          ? 'Welcome back! Please enter your details.'
          : 'Enter your Doctor ID and password to access your portal.'}
      </p>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* ── Admin / Staff Login Form ── */}
      {mode === 'admin' && (
        <form onSubmit={handleAdminSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="auth-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="auth-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              Remember Me
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-disclaimer">
            By clicking on 'Sign in', you acknowledge the <a href="#">Terms of Services</a> and <a href="#">Privacy Policy</a>
          </p>

          <div className="auth-switch">
            Not an existing user? <Link to="/signup">Sign up for demo</Link>
          </div>
        </form>
      )}

      {/* ── Doctor Portal Login Form ── */}
      {mode === 'doctor' && (
        <form onSubmit={handleDoctorSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="doctorLoginId">Doctor ID</label>
            <input
              type="text"
              id="doctorLoginId"
              className="auth-input"
              placeholder="Enter your Doctor ID"
              value={doctorLoginId}
              onChange={(e) => setDoctorLoginId(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="doctorPassword">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="doctorPassword"
                className="auth-input"
                placeholder="Your portal password"
                value={doctorPassword}
                onChange={(e) => setDoctorPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            {loading ? 'Signing in…' : 'Access Doctor Portal'}
          </button>

          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
            Admin/Staff?{' '}
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
            >
              Sign in here
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
