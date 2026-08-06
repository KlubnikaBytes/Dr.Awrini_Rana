import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/daycare/`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

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
};

export default dayCareService;

