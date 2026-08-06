import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/services/`;

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': localStorage.getItem('clinicId') }
  };
};

const serviceApi = {
  getServices: async () => {
    const response = await axios.get(API_URL, getConfig());
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await axios.post(API_URL, serviceData, getConfig());
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await axios.put(`${API_URL}${id}`, serviceData, getConfig());
    return response.data;
  },

  deleteService: async (id) => {
    const response = await axios.delete(`${API_URL}${id}`, getConfig());
    return response.data;
  }
};

export default serviceApi;

