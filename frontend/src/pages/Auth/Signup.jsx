import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity } from 'lucide-react';
import axios from 'axios';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        name,
        email,
        password
      });
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/'); // Redirect to dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign up');
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-logo">
        <h2>
          <Activity className="auth-logo-icon" /> ASR Clinic
        </h2>
      </div>
      
      <h3 className="form-title">Sign up</h3>
      <p className="form-subtitle">Create your account to get started.</p>
      
      {error && <div style={{color: 'red', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center'}}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="name">Full Name</label>
          <input 
            type="text" 
            id="name" 
            className="auth-input" 
            placeholder="Dr. John Doe" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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
              placeholder="Create a password"
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
        
        <button type="submit" className="auth-button">Sign up</button>
        
        <p className="auth-disclaimer">
          By clicking on 'Sign up', you acknowledge the <a href="#">Terms of Services</a> and <a href="#">Privacy Policy</a>
        </p>
        
        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
