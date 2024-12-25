import Storage from '../storage/index';

// Common fetch API wrapper
export const BASE_URL = '/api/v1';
export const BASE_DATA_PATH = '/data';

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401) {
            try {
                const errorData = await response.json();
                console.log('errorData', errorData);
                if (errorData.status === "error" && errorData.data.status === 401) {
                    // Show confirmation dialog
                    const confirmRelogin = window.confirm('Your session has expired. Please login again to continue.');
                    if (confirmRelogin) {
                        await Storage.remove('token');
                        // Redirect to login page
                        window.location.href = '/#/login';
                    }
                }
            } catch (e) {
                console.error('Error parsing 401 response:', e);
            }
        }
        
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = response;  // Attach the response object
        throw error;
    }
    
    return response.json();
};

// {{ edit_1 }}
export const get = async (endpoint) => {
    const token = await Storage.get('token');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
    });

    return await handleResponse(response);
};
// {{ edit_2 }}

export const postSimple = async (endpoint, data) => {
    const token = await Storage.get('token');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data).toString(),
        credentials: 'include',
    });
    
    return handleResponse(response);
};

// Modify the post function
export const post = async (endpoint, data) => {
    const token = await Storage.get('token');
    return fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`, // Add Authorization header
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data).toString(),
        credentials: 'include', // Ensure credentials are included if needed
        mode: 'cors',
    }).then(handleResponse);
};

export const post_json = async (endpoint, data, method = 'POST') => {
    const token = await Storage.get('token');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = response;
        throw error;
    }

    return await response.json();
};

export const put = async (endpoint, data) => {
    const token = await Storage.get('token');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'An error occurred');
    }
    
    return response.json();
};

export const del = async (endpoint) => {
    const token = await Storage.get('token');
    return fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`, // Add Authorization header
            'Content-Type': 'application/json',
        },
    }).then(handleResponse);
};

const API_URL = 'http://localhost:5000';

// Use API_URL in your API calls, for example:
export const fetchSomeData = async () => {
    const response = await fetch(`${API_URL}/some-endpoint`);
    return response.json();
};

// Add more API calls as needed

export const getSpeechConfig = async () => {
    const response = await fetch(`${BASE_URL}/api/speech-config`);
    if (!response.ok) {
        throw new Error('Failed to fetch speech config');
    }
    return response.json();
};

export const assessPronunciation = async (formData, referenceText, language = 'en-US') => {
    const token = await Storage.get('token');
    formData.append('reference_text', referenceText);
    formData.append('language', language);
    const response = await fetch(`${BASE_URL}/assess-pronunciation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`, // Add Authorization header
        },
        body: formData,
    });
    if (!response.ok) {
        throw new Error('Failed to assess pronunciation');
    }
    return response.json();
};

export const postFormData = async (endpoint, formData) => {
    const token = await Storage.get('token');
    return fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`, // Add Authorization header
        },
        body: formData,
    }).then(handleResponse);
};

// New function to fetch file content
export const fetch_file = async (url) => {
    const response = await fetch(`${BASE_URL}${url}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  };

// Add this new function
export const putFormData = async (endpoint, formData) => {
    const token = await Storage.get('token');
    return fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    }).then(handleResponse);
};

export const patch = async (endpoint, data) => {
  const token = await Storage.get('token');
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
