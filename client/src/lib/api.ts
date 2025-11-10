// API configuration
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) 
  || 'http://localhost:3000/api';

// User type
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Login user
export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
}

// Sign up user
export async function signupUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Signup API error:', error);
    throw error;
  }
}

// Reset password
export async function resetPassword(email: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset failed');
    }
  } catch (error) {
    console.error('Reset password API error:', error);
    throw error;
  }
}

// Logout user
export function logoutUser(): void {
  // If you have a logout endpoint, call it here
  // For now, this is just a client-side logout
  console.log('User logged out');
}
