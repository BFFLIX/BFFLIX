// Circles API Service
// Endpoint: GET /circles

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://bfflix.com/api';

// Development mode flag - set to true to use mock data
const USE_MOCK_DATA = true; // Toggle this when backend is ready

// Get auth token from localStorage
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
}

// Create headers with auth token
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Circle = {
  id: string;
  name: string;
  members: number;
};

export type CirclesResponse = {
  circles: Circle[];
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get user's circles
 * GET /circles
 * Requires authentication
 * @returns List of circles the user is a member of
 */
export async function getCircles(): Promise<CirclesResponse> {
  if (USE_MOCK_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return getMockCircles();
  }

  try {
    const response = await fetch(`${API_BASE}/circles`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn('Circles API failed, using mock data');
      await new Promise(resolve => setTimeout(resolve, 800));
      return getMockCircles();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Circles API unavailable, using mock data');
    await new Promise(resolve => setTimeout(resolve, 800));
    return getMockCircles();
  }
}

// ============================================================================
// MOCK DATA
// ============================================================================

function getMockCircles(): CirclesResponse {
  return {
    circles: [
      { id: 'circle1', name: 'Movie Night Friends', members: 12 },
      { id: 'circle2', name: 'Roommates', members: 4 },
      { id: 'circle3', name: 'Marvel Fans', members: 47 },
      { id: 'circle4', name: 'Sci-Fi Club', members: 23 },
      { id: 'circle5', name: 'Horror Squad', members: 15 },
      { id: 'circle6', name: 'Anime Watchers', members: 31 },
    ],
  };
}
