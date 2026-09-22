import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to manage the doctor portal session.
 * Fetches the live doctor identity from the backend on load,
 * rather than trusting localStorage.
 */
export const useDoctorSession = () => {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const doctorToken = localStorage.getItem('doctorToken');
      if (!doctorToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/doctor-me`, {
          headers: { Authorization: `Bearer ${doctorToken}` }
        });
        setDoctorInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch doctor session:', err);
        setError(err.response?.data?.message || 'Session expired');
        localStorage.removeItem('doctorToken');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [navigate]);

  return { doctorInfo, loading, error };
};
