/**
 * CloudChat Authentication Utilities
 * Use this in your main app's JavaScript to manage authentication
 */

const API_URL = 'http://localhost:5000/api';

// ====================
// Auth Storage & State
// ====================

const AuthManager = {
    getToken() {
        return localStorage.getItem('authToken');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    setAuthentication(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/auth.html';
    },

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
};

// ====================
// Protected Route Check
// ====================

function checkAuthentication() {
    if (!AuthManager.isAuthenticated()) {
        window.location.href = '/auth.html';
        return false;
    }
    return true;
}

// ====================
// API Request Wrapper
// ====================

async function apiCall(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = options.headers || {};

    // Add auth header if token exists
    if (AuthManager.isAuthenticated()) {
        headers['Authorization'] = `Bearer ${AuthManager.getToken()}`;
    }

    if (!headers['Content-Type'] && options.method !== 'GET') {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // If unauthorized, redirect to login
        if (response.status === 401) {
            AuthManager.logout();
            throw new Error('Session expired. Please log in again.');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ====================
// User Methods
// ====================

const UserAPI = {
    async getMe() {
        return apiCall('/auth/me', { method: 'GET' });
    },

    async updateProfile(data) {
        return apiCall('/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async logout() {
        try {
            await apiCall('/auth/logout', { method: 'POST' });
        } finally {
            AuthManager.logout();
        }
    }
};

// ====================
// Group Methods
// ====================

const GroupAPI = {
    async getAll() {
        return apiCall('/groups', { method: 'GET' });
    },

    async getById(groupId) {
        return apiCall(`/groups/${groupId}`, { method: 'GET' });
    },

    async create(data) {
        return apiCall('/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async update(groupId, data) {
        return apiCall(`/groups/${groupId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async delete(groupId) {
        return apiCall(`/groups/${groupId}`, {
            method: 'DELETE'
        });
    },

    async join(groupId) {
        return apiCall(`/groups/${groupId}/join`, {
            method: 'POST'
        });
    },

    async leave(groupId) {
        return apiCall(`/groups/${groupId}/leave`, {
            method: 'POST'
        });
    }
};

// ====================
// Message Methods
// ====================

const MessageAPI = {
    async getByGroup(groupId, query = {}) {
        const params = new URLSearchParams(query);
        return apiCall(`/groups/${groupId}/messages?${params}`, { method: 'GET' });
    },

    async send(groupId, data) {
        return apiCall(`/groups/${groupId}/messages`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async delete(groupId, messageId) {
        return apiCall(`/groups/${groupId}/messages/${messageId}`, {
            method: 'DELETE'
        });
    }
};

// ====================
// Export for use
// ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthManager,
        checkAuthentication,
        apiCall,
        UserAPI,
        GroupAPI,
        MessageAPI
    };
}
