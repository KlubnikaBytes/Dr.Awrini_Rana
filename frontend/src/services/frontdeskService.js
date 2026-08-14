import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/frontdesk/`;

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': localStorage.getItem('clinicId') }
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

  updateAppointment: async (appointmentId, appointmentData) => {
    const response = await axios.put(`${API_URL}appointments/${appointmentId}`, appointmentData, getConfig());
    return response.data;
  },

  updateAppointmentStatus: async (appointmentId, status) => {
    const response = await axios.put(`${API_URL}appointments/${appointmentId}/status`, { status }, getConfig());
    return response.data;
  },

  updatePatient: async (patientId, patientData) => {
    const response = await axios.put(`${API_URL}patients/${patientId}`, patientData, getConfig());
    return response.data;
  },

  getBills: async (params) => {
    const response = await axios.get(`${API_URL}bills`, { ...getConfig(), params });
    return response.data;
  },

  createBill: async (data) => {
    const response = await axios.post(`${API_URL}bills`, data, getConfig());
    return response.data;
  },

  updateBill: async (billId, data) => {
    const response = await axios.put(`${API_URL}bills/${billId}`, data, getConfig());
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

