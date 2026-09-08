import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/reports`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-clinic-id': localStorage.getItem('clinicId')
    }
  };
};

const getBillingReport = async (startDate, endDate) => {
  try {
    let url = `${API_URL}/billing`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching billing report", error);
    throw error;
  }
};

const getCareAnalytics = async (sourceType, startDate, endDate) => {
  try {
    let url = `${API_URL}/care-analytics`;
    const params = new URLSearchParams();
    if (sourceType) params.append('sourceType', sourceType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching care analytics report", error);
    throw error;
  }
};

const getReferralAnalytics = async (startDate, endDate) => {
  try {
    let url = `${API_URL}/referrals`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching referral analytics", error);
    throw error;
  }
};

const getMedicineHistory = async (startDate, endDate) => {
  try {
    let url = `${API_URL}/medicine-history`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching medicine history", error);
    throw error;
  }
};

const getMedicinePatients = async (medicineName, startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (medicineName) params.append('medicineName', medicineName);
    if (startDate)    params.append('startDate', startDate);
    if (endDate)      params.append('endDate', endDate);
    const response = await axios.get(`${API_URL}/medicine-patients?${params.toString()}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching medicine patients', error);
    throw error;
  }
};

const getTestPatients = async (testName, startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (testName)   params.append('testName', testName);
    if (startDate)  params.append('startDate', startDate);
    if (endDate)    params.append('endDate', endDate);
    const response = await axios.get(`${API_URL}/test-patients?${params.toString()}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching test patients', error);
    throw error;
  }
};

const updateMedicineMeta = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/medicine-meta`, data, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error updating medicine meta", error);
    throw error;
  }
};

export default {
  getBillingReport,
  getCareAnalytics,
  getReferralAnalytics,
  getMedicineHistory,
  updateMedicineMeta,
  getTestPatients,
  getMedicinePatients
};
