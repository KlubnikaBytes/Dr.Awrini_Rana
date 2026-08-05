import axios from 'axios';

const API_URL = 'http://localhost:5000/api/reports';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
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

export default {
  getBillingReport
};
