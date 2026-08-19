import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/admin/`;

// Helper to get auth header
const getConfig = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return {
    headers: {
      Authorization: `Bearer ${user?.token}`,
      'x-clinic-id': localStorage.getItem('clinicId')
    },
  };
};

// --- Staff ---
const getStaff = async () => {
  const response = await axios.get(API_URL + 'staff', getConfig());
  return response.data;
};

const addStaff = async (staffData) => {
  const response = await axios.post(API_URL + 'staff', staffData, getConfig());
  return response.data;
};

const updateStaff = async (id, staffData) => {
  const response = await axios.put(API_URL + 'staff/' + id, staffData, getConfig());
  return response.data;
};

const deleteStaff = async (id) => {
  const response = await axios.delete(API_URL + 'staff/' + id, getConfig());
  return response.data;
};

// --- Referral Doctors ---
const getReferralDoctors = async () => {
  const response = await axios.get(API_URL + 'referral-doctors', getConfig());
  return response.data;
};

const addReferralDoctor = async (docData) => {
  const response = await axios.post(API_URL + 'referral-doctors', docData, getConfig());
  return response.data;
};

const deleteReferralDoctor = async (id) => {
  const response = await axios.delete(API_URL + 'referral-doctors/' + id, getConfig());
  return response.data;
};

// --- Vendors ---
const getVendors = async () => {
  const response = await axios.get(API_URL + 'vendors', getConfig());
  return response.data;
};

const addVendor = async (vendorData) => {
  const response = await axios.post(API_URL + 'vendors', vendorData, getConfig());
  return response.data;
};

const deleteVendor = async (id) => {
  const response = await axios.delete(API_URL + 'vendors/' + id, getConfig());
  return response.data;
};

// ================= LAB CATALOG =================
const getLabCatalog = async () => {
  const response = await axios.get(API_URL + 'lab-catalog', getConfig());
  return response.data;
};

const addLabCategory = async (data) => {
  const response = await axios.post(API_URL + 'lab-catalog', data, getConfig());
  return response.data;
};

const updateLabCategory = async (id, data) => {
  const response = await axios.put(API_URL + 'lab-catalog/' + id, data, getConfig());
  return response.data;
};

const deleteLabCategory = async (id) => {
  const response = await axios.delete(API_URL + 'lab-catalog/' + id, getConfig());
  return response.data;
};

// ================= TIE-UP ORGS =================
const getTieUpOrgs = async () => {
  const response = await axios.get(API_URL + 'tie-up-orgs', getConfig());
  return response.data;
};

const addTieUpOrg = async (data) => {
  const response = await axios.post(API_URL + 'tie-up-orgs', data, getConfig());
  return response.data;
};

const updateTieUpOrg = async (id, data) => {
  const response = await axios.put(API_URL + 'tie-up-orgs/' + id, data, getConfig());
  return response.data;
};

const deleteTieUpOrg = async (id) => {
  const response = await axios.delete(API_URL + 'tie-up-orgs/' + id, getConfig());
  return response.data;
};

const adminService = {
  getStaff, addStaff, updateStaff, deleteStaff,
  getReferralDoctors, addReferralDoctor, deleteReferralDoctor,
  getVendors, addVendor, deleteVendor,
  getLabCatalog, addLabCategory, updateLabCategory, deleteLabCategory,
  getTieUpOrgs, addTieUpOrg, updateTieUpOrg, deleteTieUpOrg
};

export default adminService;

