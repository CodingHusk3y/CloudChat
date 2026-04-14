// ====================
// API Configuration
// ====================
const API_URL = (() => {
    if (window.location.protocol === 'file:') return 'http://localhost:5000/api';
    const isLocalFrontend = window.location.hostname === 'localhost' && window.location.port === '3000';
    if (isLocalFrontend) return 'http://localhost:5000/api';
    return `${window.location.origin}/api`;
})();

// ====================
// State Management
// ====================
class Auth {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.isAuthenticated = !!this.token;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        this.isAuthenticated = true;
    }

    setUser(user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    logout() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    getAuthHeader() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }
}

const auth = new Auth();

function getAppPageUrl() {
    return window.location.protocol === 'file:' ? 'index.html' : '/';
}

// ====================
// DOM Elements
// ====================
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const loginSuccess = document.getElementById('loginSuccess');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const formSections = document.querySelectorAll('.form-section');
const passwordInput = document.getElementById('signupPassword');
const strengthBar = document.getElementById('strengthBar');

// ====================
// UI Utilities
// ====================

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

function setLoading(btn, isLoading) {
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('loading');
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

function switchTab(tabName) {
    // Update buttons
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update forms
    formSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === tabName) {
            section.classList.add('active');
        }
    });

    // Clear previous messages
    [loginError, loginSuccess, signupError, signupSuccess].forEach(el => {
        el.classList.remove('show');
    });
}

function analyzePassword(password) {
    let strength = 0;

    // Check length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Check for lowercase
    if (/[a-z]/.test(password)) strength++;

    // Check for uppercase
    if (/[A-Z]/.test(password)) strength++;

    // Check for numbers
    if (/[0-9]/.test(password)) strength++;

    // Check for special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    return Math.min(strength, 3), strength;
}

function updatePasswordStrength(password) {
    if (!password) {
        strengthBar.className = 'password-strength-bar';
        return;
    }

    const [level, score] = analyzePassword(password);
    strengthBar.className = 'password-strength-bar';

    if (level === 1 || score < 2) {
        strengthBar.classList.add('weak');
    } else if (level === 2 || score < 4) {
        strengthBar.classList.add('medium');
    } else {
        strengthBar.classList.add('strong');
    }
}

// ====================
// API Calls
// ====================

async function loginUser(email, password) {
    try {
        setLoading(loginBtn, true);
        loginError.classList.remove('show');

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(loginError, data.message || 'Login failed');
            return;
        }

        // Store authentication data
        auth.setToken(data.token);
        auth.setUser(data.user);

        showSuccess(loginSuccess, 'Login successful! Redirecting...');

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = getAppPageUrl();
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showError(loginError, 'Network error. Please try again.');
    } finally {
        setLoading(loginBtn, false);
    }
}

async function signupUser(username, email, password) {
    try {
        setLoading(signupBtn, true);
        signupError.classList.remove('show');

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (Array.isArray(data.errors)) {
                const errorMessages = data.errors
                    .map(e => e.message)
                    .join(', ');
                showError(signupError, errorMessages);
            } else {
                showError(signupError, data.message || 'Signup failed');
            }
            return;
        }

        // Store authentication data
        auth.setToken(data.token);
        auth.setUser(data.user);

        showSuccess(signupSuccess, 'Account created! Redirecting...');

        // Clear form
        signupForm.reset();
        updatePasswordStrength('');

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = getAppPageUrl();
        }, 1500);

    } catch (error) {
        console.error('Signup error:', error);
        showError(signupError, 'Network error. Please try again.');
    } finally {
        setLoading(signupBtn, false);
    }
}

// ====================
// Event Listeners
// ====================

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

// Login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError(loginError, 'Please fill in all fields');
        return;
    }

    loginUser(email, password);
});

// Signup form submission
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // Client-side validation
    if (!username || !email || !password) {
        showError(signupError, 'Please fill in all fields');
        return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        showError(signupError, 'Username can only contain letters, numbers, dash, and underscore');
        return;
    }

    if (username.length < 3 || username.length > 30) {
        showError(signupError, 'Username must be 3-30 characters');
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showError(signupError, 'Please enter a valid email');
        return;
    }

    if (password.length < 8) {
        showError(signupError, 'Password must be at least 8 characters');
        return;
    }

    if (!/[A-Z]/.test(password)) {
        showError(signupError, 'Password must contain at least one uppercase letter');
        return;
    }

    if (!/[0-9]/.test(password)) {
        showError(signupError, 'Password must contain at least one number');
        return;
    }

    signupUser(username, email, password);
});

// Password strength indicator
passwordInput.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
});

// ====================
// Initialization
// ====================

// If user is already logged in, redirect to main page
if (auth.isAuthenticated) {
    window.location.href = getAppPageUrl();
}

console.log('🔐 CloudChat Authentication System Loaded');
