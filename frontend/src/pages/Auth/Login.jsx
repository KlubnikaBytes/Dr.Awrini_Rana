import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email,
        password
      });
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/select-clinic'); // Redirect to clinic selection
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-logo">
        <h2>
          <Activity className="auth-logo-icon" /> ASR Clinic
        </h2>
      </div>
      
      <h3 className="form-title">Sign in</h3>
      <p className="form-subtitle">Welcome back! Please enter your details.</p>
      
      {error && <div style={{color: 'red', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center'}}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
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
              type={showPassword ? "text" : "password"} 
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
          <a href="#" className="forgot-link">Forgot Password</a>
        </div>
        
        <button type="submit" className="auth-button">Sign in</button>
        
        <p className="auth-disclaimer">
          By clicking on 'Sign in', you acknowledge the <a href="#">Terms of Services</a> and <a href="#">Privacy Policy</a>
        </p>
        
        <div className="auth-switch">
          Not an existing user? <Link to="/signup">Sign up for demo</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
