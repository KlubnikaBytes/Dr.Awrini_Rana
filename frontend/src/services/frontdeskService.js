import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/frontdesk/`;

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const frontdeskService = {
  getAppointments: async (params) => {
    const response = await axios.get(`${API_URL}appointments`, { ...getConfig(), params });
    return response.data;
  },

  createAppointment: async (appointmentData) => {
    const response = await axios.post(`${API_URL}appointments`, appointmentData, getConfig());
    return response.data;
  },

  getBills: async (appointmentId) => {
    const response = await axios.get(`${API_URL}bills`, { ...getConfig(), params: { appointmentId } });
    return response.data;
  },

  payBill: async (billId, paymentData) => {
    const response = await axios.post(`${API_URL}bills/${billId}/pay`, paymentData, getConfig());
    return response.data;
  },

  updateVitals: async (appointmentId, vitals) => {
    const response = await axios.post(`${API_URL}appointments/${appointmentId}/vitals`, { vitals }, getConfig());
    return response.data;
  },

  getTestResults: async (appointmentId) => {
    const response = await axios.get(`${API_URL}appointments/${appointmentId}/tests`, getConfig());
    return response.data;
  },

  saveTestResults: async (appointmentId, tests) => {
    const response = await axios.post(`${API_URL}appointments/${appointmentId}/tests`, { tests }, getConfig());
    return response.data;
  },

  getAttachments: async (appointmentId) => {
    const response = await axios.get(`${API_URL}appointments/${appointmentId}/attachments`, getConfig());
    return response.data;
  },

  uploadAttachment: async (appointmentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}appointments/${appointmentId}/attachments`, formData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default frontdeskService;
