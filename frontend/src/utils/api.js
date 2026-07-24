const API_URL = process.env.REACT_APP_BACKEND_URL;

export const api = {
  // Health check
  health: async () => {
    const response = await fetch(`${API_URL}/api/health`);
    return response.json();
  },

  // Predict from image file
  predict: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/predict`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Prediction failed');
    }
    
    return response.json();
  },

  // Fast predict for camera frames
  predictFrame: async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    
    const response = await fetch(`${API_URL}/api/predict/frame`, {
      method: 'POST',
      body: formData,
    });
    
    return response.json();
  },

  // Get prediction history
  getHistory: async (limit = 50) => {
    const response = await fetch(`${API_URL}/api/history?limit=${limit}`);
    return response.json();
  },

  // Get single prediction
  getPrediction: async (id) => {
    const response = await fetch(`${API_URL}/api/prediction/${id}`);
    return response.json();
  },

  // Clear history
  clearHistory: async () => {
    const response = await fetch(`${API_URL}/api/history`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

export default api;