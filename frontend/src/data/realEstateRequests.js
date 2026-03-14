import { api } from '../utils/api';

export const getRequests = async (page = 1, limit = 100, filters = {}) => {
  try {
    const params = { page, per_page: limit, ...filters };
    const response = await api.get('/api/real-estate-requests', { params });
    if (response.data && response.data.data) {
        return response.data.data.map(item => ({
            ...item,
            customer: item.customer_name || item.customer, // Map backend to frontend
        }));
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    console.error('Error fetching real estate requests', e);
    return [];
  }
};

export const saveRequest = async (request) => {
  try {
    let response;
    // Map frontend fields to backend
    const dataToSend = {
        ...request,
        customer_name: request.customer,
        customer: undefined // clean up
    };

    const isTempId = String(request.id).length > 10; // Date.now() is 13 digits

    if (request.id && !isTempId) {
        response = await api.put(`/api/real-estate-requests/${request.id}`, dataToSend);
    } else {
        const { id, ...data } = dataToSend;
        response = await api.post('/api/real-estate-requests', data);
    }
    
    window.dispatchEvent(new Event('real-estate-requests-updated'));
    return response.data;
  } catch (e) {
    console.error('Error saving real estate request', e);
    throw e;
  }
};

export const deleteRequest = async (id) => {
    try {
        await api.delete(`/api/real-estate-requests/${id}`);
        window.dispatchEvent(new Event('real-estate-requests-updated'));
    } catch (e) {
        console.error('Error deleting real estate request', e);
        throw e;
    }
};
