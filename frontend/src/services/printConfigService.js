import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL}/print-config`;

const getConfig = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return {
    headers: {
      Authorization: `Bearer ${user?.token}`,
      'x-clinic-id': localStorage.getItem('clinicId'),
    },
  };
};

/** List all templates (id, templateName, isDefault) */
const getAllTemplates = async () => {
  const res = await axios.get(`${BASE_URL}/templates`, getConfig());
  return res.data;
};

/** Fetch full data for a template. If no id, returns default */
const getPrintConfig = async (id = null) => {
  const url = id ? `${BASE_URL}/${id}` : BASE_URL;
  const res  = await axios.get(url, getConfig());
  return res.data;
};

/** Create a new named template (optionally clone from copyFrom id) */
const createTemplate = async (templateName, copyFrom = null) => {
  const res = await axios.post(BASE_URL, { templateName, copyFrom }, getConfig());
  return res.data;
};

/** Save/update a specific template by id */
const savePrintConfig = async (id, data) => {
  const res = await axios.put(`${BASE_URL}/${id}`, data, getConfig());
  return res.data;
};

/** Delete a template by id */
const deleteTemplate = async (id) => {
  const res = await axios.delete(`${BASE_URL}/${id}`, getConfig());
  return res.data;
};

/** Upload header image for a template */
const uploadHeaderImage = async (templateId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const cfg = { ...getConfig(), headers: { ...getConfig().headers, 'Content-Type': 'multipart/form-data' } };
  const url = templateId ? `${BASE_URL}/header/${templateId}` : `${BASE_URL}/header`;
  const res = await axios.post(url, formData, cfg);
  return res.data;
};

/** Upload footer image for a template */
const uploadFooterImage = async (templateId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const cfg = { ...getConfig(), headers: { ...getConfig().headers, 'Content-Type': 'multipart/form-data' } };
  const url = templateId ? `${BASE_URL}/footer/${templateId}` : `${BASE_URL}/footer`;
  const res = await axios.post(url, formData, cfg);
  return res.data;
};

/** Clear header or footer image */
const clearImage = async (type, templateId = null) => {
  const url = templateId ? `${BASE_URL}/image/${type}/${templateId}` : `${BASE_URL}/image/${type}`;
  const res  = await axios.delete(url, getConfig());
  return res.data;
};

const printConfigService = {
  getAllTemplates,
  getPrintConfig,
  createTemplate,
  savePrintConfig,
  deleteTemplate,
  uploadHeaderImage,
  uploadFooterImage,
  clearImage,
};

export default printConfigService;
