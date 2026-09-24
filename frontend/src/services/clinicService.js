import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/clinics/`;

const getConfig = () => {
  const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('doctorToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-clinic-id': localStorage.getItem('clinicId') || ''
    }
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

  deleteClinic: async (id, passcode) => {
    const response = await axios.delete(`${API_URL}${id}`, {
      ...getConfig(),
      data: { passcode }
    });
    return response.data;
  },

  uploadLogo: async (id, file) => {
    const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('doctorToken');
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post(`${API_URL}${id}/logo`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  removeLogo: async (id) => {
    const response = await axios.delete(`${API_URL}${id}/logo`, getConfig());
    return response.data;
  },

  verifyClinicCode: async (id, passcode) => {
    const response = await axios.post(`${API_URL}${id}/verify-code`, { passcode }, getConfig());
    return response.data;
  }
};

export default clinicService;
