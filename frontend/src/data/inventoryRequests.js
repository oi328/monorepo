import { api } from '../utils/api';

export const getRequests = async (page = 1, limit = 100) => {
  try {
    const response = await api.get(`/api/inventory-requests?page=${page}&per_page=${limit}`);
    if (response.data && response.data.data) {
        // Map backend snake_case to frontend expectation if needed, though model has appends
        // The Model has appends for customerName, propertyUnit, etc. so it should be fine.
        return response.data.data; 
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    console.error('Error fetching requests', e);
    return [];
  }
};

export const saveRequest = async (request) => {
  try {
    let response;
    // Check if ID is present and valid (not a temp ID if we used those)
    // The backend uses auto-increment IDs.
    if (request.id) {
        response = await api.put(`/api/inventory-requests/${request.id}`, request);
    } else {
        response = await api.post('/api/inventory-requests', request);
    }
    
    // Dispatch event for real-time updates across components
    window.dispatchEvent(new Event('inventory-requests-updated'));
    return response.data;
  } catch (e) {
    console.error('Error saving request', e);
    throw e;
  }
};

export const deleteRequest = async (id) => {
  try {
    await api.delete(`/api/inventory-requests/${id}`);
    window.dispatchEvent(new Event('inventory-requests-updated'));
  } catch (e) {
    console.error('Error deleting request', e);
    throw e;
  }
};
