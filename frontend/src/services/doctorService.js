import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/doctor/`;

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const doctorService = {
  getConsultation: async (appointmentId) => {
    const response = await axios.get(`${API_URL}consultation/${appointmentId}`, getConfig());
    return response.data;
  },
  
  saveConsultation: async (appointmentId, data) => {
    const response = await axios.post(`${API_URL}consultation/${appointmentId}`, data, getConfig());
    return response.data;
  },
  
  getPastConsultations: async (patientId) => {
    const response = await axios.get(`${API_URL}patient/${patientId}/past-consultations`, getConfig());
    return response.data;
  },
  
  getSuggestions: async (type, q = '') => {
    const response = await axios.get(`${API_URL}suggestions`, { ...getConfig(), params: { type, q } });
    return response.data;
  },
  
  getMedicineDetails: async (name) => {
    const response = await axios.get(`${API_URL}medicine-details`, { ...getConfig(), params: { name } });
    return response.data;
  },
  
  getPatientVaccines: async (patientId) => {
    const response = await axios.get(`${API_URL}patient/${patientId}/vaccines`, getConfig());
    return response.data;
  },
  
  savePatientVaccines: async (patientId, vaccines) => {
    const response = await axios.post(`${API_URL}patient/${patientId}/vaccines`, { vaccines }, getConfig());
    return response.data;
  },
  
  getVaccineTemplates: async () => {
    const response = await axios.get(`${API_URL}vaccine-templates`, getConfig());
    return response.data;
  },
  
  saveVaccineTemplates: async (templates) => {
    const response = await axios.post(`${API_URL}vaccine-templates`, templates, getConfig());
    return response.data;
  },
  
  getPatientTests: async (patientId) => {
    const response = await axios.get(`${API_URL}patient/${patientId}/tests`, getConfig());
    return response.data;
  },

  getAppointmentTests: async (appointmentId) => {
    const response = await axios.get(`${API_URL}appointment/${appointmentId}/tests`, getConfig());
    return response.data;
  },
  
  saveAppointmentTests: async (appointmentId, tests) => {
    const response = await axios.post(`${API_URL}appointment/${appointmentId}/tests`, tests, getConfig());
    return response.data;
  },

  getPatientDocuments: async (patientId) => {
    const response = await axios.get(`${API_URL}patient/${patientId}/documents`, getConfig());
    return response.data;
  },

  getAllLabResults: async () => {
    const response = await axios.get(`${API_URL}lab/results`, getConfig());
    return response.data;
  }
};

export default doctorService;
