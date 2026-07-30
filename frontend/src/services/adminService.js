import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/admin/`;

// Helper to get auth header
const getConfig = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return {
    headers: {
      Authorization: `Bearer ${user?.token}`,
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

const adminService = {
  getStaff, addStaff,
  getReferralDoctors, addReferralDoctor, deleteReferralDoctor,
  getVendors, addVendor, deleteVendor
};

export default adminService;
