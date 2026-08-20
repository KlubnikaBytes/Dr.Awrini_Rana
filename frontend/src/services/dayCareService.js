import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/daycare/`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'x-clinic-id': localStorage.getItem('clinicId') } });


const dayCareService = {
  getAll:    async ()       => (await axios.get(API_URL, cfg())).data,
  getById:   async (id)     => (await axios.get(`${API_URL}${id}`, cfg())).data,
  create:    async (data)   => (await axios.post(API_URL, data, cfg())).data,
  update:    async (id, d)  => (await axios.put(`${API_URL}${id}`, d, cfg())).data,
  delete:    async (id)     => (await axios.delete(`${API_URL}${id}`, cfg())).data,
  uploadDoc: async (id, file) => {
    const fd = new FormData(); fd.append('file', file);
    return (await axios.post(`${API_URL}${id}/documents`, fd, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
    })).data;
  },
  deleteDoc: async (id, docId) => (await axios.delete(`${API_URL}${id}/documents/${docId}`, cfg())).data,
  // Billing
  getBills:   async (dayCareId) => (await axios.get(`${API_URL}bills`, { ...cfg(), params: { dayCareId } })).data,
  createBill: async (data)     => (await axios.post(`${API_URL}bills`, data, cfg())).data,
  updateBill: async (billId, data) => (await axios.put(`${API_URL}bills/${billId}`, data, cfg())).data,
  payBill:    async (billId, data) => (await axios.post(`${API_URL}bills/${billId}/pay`, data, cfg())).data,
};

export default dayCareService;

