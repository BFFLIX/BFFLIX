// API configuration
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) 
  || 'https://bfflix.com';

// Check if we're in a development/preview environment without backend access
const isDevelopmentMode = () => {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';
  } catch {
    return false;
  }
};

// User type matching backend response
export interface User {
  id: string;
  email: string;
  name: string;
}

// API Error types
interface ValidationError {
  error: 'validation';
  fieldErrors: Record<string, string>;
}

interface AuthError {
  error: 'unauthorized' | 'invalid_credentials' | 'conflict' | 'invalid_token';
  message?: string;
}

type ApiError = ValidationError | AuthError;

// Auth response type
interface AuthResponse {
  user: User;
  token: string;
}

// Token management
export function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem('token', token);
  } catch (error) {
    console.error('Error setting token in localStorage:', error);
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Error clearing token from localStorage:', error);
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      if (error.error === 'invalid_credentials') {
        throw new Error(error.message || 'Email or password is incorrect');
      }
      
      if (error.error === 'validation' && 'fieldErrors' in error) {
        const errorMessages = Object.values(error.fieldErrors).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error('Login failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store the token
    setToken(data.token);
    
    return data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
}

// Sign up user
export async function signupUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      if (error.error === 'conflict') {
        throw new Error(error.message || 'Email already registered');
      }
      
      if (error.error === 'validation' && 'fieldErrors' in error) {
        const errorMessages = Object.values(error.fieldErrors).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error('Signup failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store the token
    setToken(data.token);
    
    return data;
  } catch (error) {
    console.error('Signup API error:', error);
    throw error;
  }
}

// Request password reset
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/request-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      if (error.error === 'validation' && 'fieldErrors' in error) {
        const errorMessages = Object.values(error.fieldErrors).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error('Password reset request failed');
    }
  } catch (error) {
    console.error('Request password reset API error:', error);
    throw error;
  }
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      
      if (error.error === 'invalid_token') {
        throw new Error(error.message || 'Reset token is invalid or expired');
      }
      
      if (error.error === 'validation' && 'fieldErrors' in error) {
        const errorMessages = Object.values(error.fieldErrors).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error('Password reset failed');
    }
  } catch (error) {
    console.error('Reset password API error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid or expired, clear it
        clearToken();
        throw new Error('Session expired. Please login again.');
      }
      
      throw new Error('Failed to get user information');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Get current user API error:', error);
    // Clear token if there's any error
    clearToken();
    throw error;
  }
}

// Logout user
export async function logoutUser(): Promise<void> {
  try {
    const token = getToken();
    
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Clear token regardless of API response
    clearToken();
  } catch (error) {
    console.error('Logout API error:', error);
    // Still clear token even if API call fails
    clearToken();
  }
}