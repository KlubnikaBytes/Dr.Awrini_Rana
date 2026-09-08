import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/laborders/catalog`;

const getConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'x-clinic-id': localStorage.getItem('clinicId'),
  },
});

const getCatalogs = async () => {
  const response = await axios.get(API_URL, getConfig());
  return response.data;
};

const createCatalog = async (catalogData) => {
  const response = await axios.post(API_URL, catalogData, getConfig());
  return response.data;
};

const updateCatalog = async (id, catalogData) => {
  const response = await axios.put(`${API_URL}/${id}`, catalogData, getConfig());
  return response.data;
};

const deleteCatalog = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, getConfig());
  return response.data;
};

export default {
  getCatalogs,
  createCatalog,
  updateCatalog,
  deleteCatalog,
};
