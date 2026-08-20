import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/homecare/`;

const getConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'x-clinic-id': localStorage.getItem('clinicId') } };
};

const homeCareService = {
  getAll: async () => {
    const res = await axios.get(API_URL, getConfig());
    return res.data;
  },
  getById: async (id) => {
    const res = await axios.get(`${API_URL}${id}`, getConfig());
    return res.data;
  },
  create: async (data) => {
    const res = await axios.post(API_URL, data, getConfig());
    return res.data;
  },
  update: async (id, data) => {
    const res = await axios.put(`${API_URL}${id}`, data, getConfig());
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_URL}${id}`, getConfig());
    return res.data;
  },
  uploadDocument: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await axios.post(`${API_URL}${id}/documents`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteDocument: async (id, docId) => {
    const res = await axios.delete(`${API_URL}${id}/documents/${docId}`, getConfig());
    return res.data;
  },
  // Billing
  getBills:   async (homeCareId) => (await axios.get(`${API_URL}bills`, { ...getConfig(), params: { homeCareId } })).data,
  createBill: async (data)       => (await axios.post(`${API_URL}bills`, data, getConfig())).data,
  updateBill: async (billId, data) => (await axios.put(`${API_URL}bills/${billId}`, data, getConfig())).data,
  payBill:    async (billId, data) => (await axios.post(`${API_URL}bills/${billId}/pay`, data, getConfig())).data,
};

export default homeCareService;

