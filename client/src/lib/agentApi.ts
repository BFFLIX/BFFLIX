// AI Agent API Service
// Endpoints for AI-powered recommendations and smart search

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

export type RecommendationItem = {
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  year: string | null;
  overview: string | null;
  poster: string | null;
  providers: string[];
  playableOnMyServices: boolean;
  playableOn: string[];
  reason: string | null;
  matchScore: number | null;
};

export type ConversationMessage = {
  type: 'conversation';
  message: string;
};

export type RecommendationResult = RecommendationItem | ConversationMessage;

export type RecommendationsRequest = {
  query: string;
  limit?: number;
  preferFeed?: boolean;
  conversationId?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
};

export type RecommendationsResponse = {
  results: RecommendationResult[];
  conversationId?: string;
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get AI-powered recommendations
 * POST /agent/recommendations
 * Multi-turn conversation with personalized recommendations
 */
export async function getRecommendations(
  request: RecommendationsRequest
): Promise<RecommendationsResponse> {
  if (USE_MOCK_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getMockRecommendations(request);
  }

  try {
    const response = await fetch(`${API_BASE}/agent/recommendations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: request.query,
        limit: request.limit || 5,
        preferFeed: request.preferFeed || false,
        conversationId: request.conversationId,
        history: request.history,
      }),
    });

    if (!response.ok) {
      console.warn('Recommendations API failed, using mock data');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return getMockRecommendations(request);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Recommendations API unavailable, using mock data');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getMockRecommendations(request);
  }
}

/**
 * Smart search for specific content
 * POST /agent/smart-search
 */
export async function smartSearch(query: string): Promise<RecommendationsResponse> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getMockSmartSearch(query);
  }

  try {
    const response = await fetch(`${API_BASE}/agent/smart-search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.warn('Smart search API failed, using mock data');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getMockSmartSearch(query);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Smart search API unavailable, using mock data');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getMockSmartSearch(query);
  }
}

// ============================================================================
// MOCK DATA
// ============================================================================

function getMockRecommendations(request: RecommendationsRequest): RecommendationsResponse {
  const query = request.query.toLowerCase();

  // Determine response type based on query
  if (query.includes('hello') || query.includes('hi')) {
    return {
      results: [
        {
          type: 'conversation',
          message: "Hey! I'm your BFFlix AI assistant. I can help you discover amazing movies and shows based on your tastes, what your circles are watching, or just a specific vibe you're looking for. What are you in the mood for today?",
        },
      ],
    };
  }

  if (query.includes('action') || query.includes('thriller')) {
    return {
      results: [
        {
          type: 'conversation',
          message: "Great choice! Here are some intense action thrillers I think you'll love:",
        },
        {
          tmdbId: '1891',
          type: 'movie',
          title: 'The Empire Strikes Back',
          year: '1980',
          overview: 'The epic saga continues as Luke Skywalker, in hopes of defeating the evil Galactic Empire, learns the ways of the Jedi from aging master Yoda.',
          poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
          providers: ['Disney+', 'Prime Video'],
          playableOnMyServices: true,
          playableOn: ['Disney+'],
          reason: 'Classic action with incredible world-building',
          matchScore: 0.95,
        },
        {
          tmdbId: '155',
          type: 'movie',
          title: 'The Dark Knight',
          year: '2008',
          overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
          poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400',
          providers: ['HBO Max', 'Netflix'],
          playableOnMyServices: true,
          playableOn: ['HBO Max'],
          reason: 'One of the greatest superhero films ever made',
          matchScore: 0.92,
        },
        {
          tmdbId: '324857',
          type: 'movie',
          title: 'Spider-Man: Into the Spider-Verse',
          year: '2018',
          overview: 'Miles Morales becomes Spider-Man and joins other Spider-People from across the multiverse.',
          poster: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400',
          providers: ['Netflix', 'Prime Video'],
          playableOnMyServices: false,
          playableOn: [],
          reason: 'Revolutionary animation meets heartfelt storytelling',
          matchScore: 0.88,
        },
      ],
    };
  }

  if (query.includes('comedy') || query.includes('funny') || query.includes('laugh')) {
    return {
      results: [
        {
          type: 'conversation',
          message: "I've got some hilarious picks that'll have you laughing out loud:",
        },
        {
          tmdbId: '157336',
          type: 'tv',
          title: 'Ted Lasso',
          year: '2020',
          overview: 'An American football coach heads to London to manage a struggling English Premier League team.',
          poster: 'https://images.unsplash.com/photo-1574267432644-f74f8ec55192?w=400',
          providers: ['Apple TV+'],
          playableOnMyServices: true,
          playableOn: ['Apple TV+'],
          reason: 'The most wholesome comedy series you\'ll ever watch',
          matchScore: 0.96,
        },
        {
          tmdbId: '2316',
          type: 'tv',
          title: 'The Office',
          year: '2005',
          overview: 'The everyday lives of office employees in the Scranton, Pennsylvania branch of Dunder Mifflin.',
          poster: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
          providers: ['Peacock', 'Netflix'],
          playableOnMyServices: false,
          playableOn: [],
          reason: 'Timeless mockumentary comedy that never gets old',
          matchScore: 0.94,
        },
      ],
    };
  }

  if (query.includes('sci-fi') || query.includes('science fiction') || query.includes('space')) {
    return {
      results: [
        {
          type: 'conversation',
          message: "Launching into some mind-bending sci-fi recommendations for you:",
        },
        {
          tmdbId: '100088',
          type: 'tv',
          title: 'The Last of Us',
          year: '2023',
          overview: 'Twenty years after a fungal outbreak ravages the planet, survivors Joel and Ellie embark on a brutal journey.',
          poster: 'https://images.unsplash.com/photo-1574268438462-201fc53fef85?w=400',
          providers: ['HBO Max'],
          playableOnMyServices: true,
          playableOn: ['HBO Max'],
          reason: 'Stunning adaptation with incredible performances',
          matchScore: 0.93,
        },
        {
          tmdbId: '603',
          type: 'movie',
          title: 'The Matrix',
          year: '1999',
          overview: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
          poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
          providers: ['HBO Max', 'Prime Video'],
          playableOnMyServices: true,
          playableOn: ['HBO Max', 'Prime Video'],
          reason: 'Revolutionary sci-fi that defined a generation',
          matchScore: 0.97,
        },
      ],
    };
  }

  // Default response for general queries
  return {
    results: [
      {
        type: 'conversation',
        message: "Based on what's popular in your circles and your viewing history, here are some personalized picks:",
      },
      {
        tmdbId: '505642',
        type: 'movie',
        title: 'Black Panther: Wakanda Forever',
        year: '2022',
        overview: 'Queen Ramonda, Shuri, M\'Baku, Okoye and the Dora Milaje fight to protect their nation from intervening world powers.',
        poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400',
        providers: ['Disney+', 'Netflix'],
        playableOnMyServices: true,
        playableOn: ['Disney+'],
        reason: 'Your circle "Sci-Fi Lovers" rated this highly',
        matchScore: 0.89,
      },
      {
        tmdbId: '569094',
        type: 'movie',
        title: 'Spider-Man: Across the Spider-Verse',
        year: '2023',
        overview: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
        poster: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400',
        providers: ['Netflix', 'Prime Video'],
        playableOnMyServices: false,
        playableOn: [],
        reason: 'Trending in your circles with amazing reviews',
        matchScore: 0.91,
      },
    ],
  };
}

function getMockSmartSearch(query: string): RecommendationsResponse {
  return {
    results: [
      {
        type: 'conversation',
        message: `Found some great matches for "${query}":`,
      },
      {
        tmdbId: '550',
        type: 'movie',
        title: 'Fight Club',
        year: '1999',
        overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
        poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
        providers: ['Prime Video', 'HBO Max'],
        playableOnMyServices: true,
        playableOn: ['Prime Video'],
        reason: 'Matches your search criteria',
        matchScore: 0.85,
      },
    ],
  };
}
