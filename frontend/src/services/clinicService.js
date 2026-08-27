import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/clinics/`;

const getConfig = () => {
  const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('user'))?.token;
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const clinicService = {
  getMyClinics: async () => {
    const response = await axios.get(`${API_URL}my`, getConfig());
    return response.data;
  },

  getAllClinics: async () => {
    const response = await axios.get(API_URL, getConfig());
    return response.data;
  },

  createClinic: async (clinicData) => {
    const response = await axios.post(API_URL, clinicData, getConfig());
    return response.data;
  },

  updateClinic: async (id, clinicData) => {
    const response = await axios.put(`${API_URL}${id}`, clinicData, getConfig());
    return response.data;
  },

  deleteClinic: async (id) => {
    const response = await axios.delete(`${API_URL}${id}`, getConfig());
    return response.data;
  }
};

export default clinicService;
