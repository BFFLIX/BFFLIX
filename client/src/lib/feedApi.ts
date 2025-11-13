// Feed API Service
// All endpoints for the BFFlix Feed
//
// ============================================================================
// API OVERVIEW
// ============================================================================
//
// 1. GET /feed - Load feed with cursor-based pagination
//    - Query params: cursor (optional), limit (default 20)
//    - Returns: { items: FeedPost[], nextCursor: string | null }
//    - Used for: Initial feed load + infinite scroll
//
// 2. POST /posts - Create a new post
//    - Body: { type, tmdbId, circles, rating?, comment?, watchedAt? }
//    - Returns: Created FeedPost
//    - Used for: CreatePostCard submission
//
// 3. GET /circles (auth) - Get user's circles for posting
//    - Returns: Circle[]
//    - Used for: Circle selection in CreatePostCard
//
// 4. GET /tmdb/search - Search TMDB for movies/TV shows
//    - Query params: q (query), type (movie|tv)
//    - Returns: TMDBResult[]
//    - Used for: Title search in CreatePostCard
//
// All API calls include Authorization: Bearer {token} header
// USE_MOCK_DATA flag enables/disables mock data fallback

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://bfflix.com/api';

// Development mode flag - set to true to use mock data
const USE_MOCK_DATA = true; // Toggle this when backend is ready

// Type definitions matching backend schema
export type FeedPost = {
  _id: string;
  author: { id: string; name: string; avatarUrl?: string };
  circles: { id: string; name: string }[];
  tmdbId: string;
  type: "movie" | "tv";
  title: string;
  year?: string | null;
  rating?: number | null;
  comment?: string | null;
  createdAt: string;
  watchedAt?: string | null;
  providers: string[];
  playableOnMyServices: boolean;
  playableOn: string[];
  likeCount: number;
  commentCount: number;
  posterUrl?: string | null;
};

export type FeedResponse = {
  items: FeedPost[];
  nextCursor?: string | null;
};

// Circle type
export type Circle = {
  id: string;
  name: string;
};

// TMDB Search Result
export type TMDBResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  media_type?: 'movie' | 'tv';
};

// Create Post Payload
export type CreatePostPayload = {
  type: "movie" | "tv";
  tmdbId: string;
  circles: string[];
  rating?: number;
  comment?: string;
  watchedAt?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};

// Get auth token from localStorage
function getAuthToken(): string | null {
  try {
    // Use the same token key as the auth system
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

/**
 * Load feed posts with pagination
 * @param cursor - Pagination cursor for next page
 * @param limit - Number of posts to fetch (default 20)
 */
export async function loadFeed(
  cursor?: string | null,
  limit: number = 20
): Promise<FeedResponse> {
  // Use mock data if flag is set
  if (USE_MOCK_DATA) {
    return getMockFeedResponse(limit);
  }

  try {
    // Build URL with query params
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor);
    }
    params.append('limit', limit.toString());

    const url = `${API_BASE}/feed?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      // If API fails, return mock data for development
      console.warn('Feed API returned error, using mock data');
      return getMockFeedResponse(limit);
    }

    const data: FeedResponse = await response.json();
    return data;
  } catch (error) {
    // Silently return mock data on error
    console.warn('Feed API unavailable, using mock data');
    return getMockFeedResponse(limit);
  }
}

/**
 * Mock feed data for development/testing
 */
function getMockFeedResponse(limit: number = 20): FeedResponse {
  const mockPosts: FeedPost[] = [
    {
      _id: '1',
      author: { 
        id: 'user1', 
        name: 'Sarah Chen', 
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'
      },
      circles: [
        { id: 'circle1', name: 'Sci-Fi Lovers' },
        { id: 'circle2', name: 'Netflix Binge' }
      ],
      tmdbId: '505642',
      type: 'movie',
      title: 'Black Panther: Wakanda Forever',
      year: '2022',
      rating: 4,
      comment: 'An emotional and powerful sequel that honors Chadwick Boseman while expanding the world of Wakanda. The underwater sequences are stunning!',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      watchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      providers: ['Disney+', 'Netflix'],
      playableOnMyServices: true,
      playableOn: ['Disney+'],
      likeCount: 24,
      commentCount: 8,
      posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400'
    },
    {
      _id: '2',
      author: { 
        id: 'user2', 
        name: 'Marcus Rodriguez', 
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
      },
      circles: [
        { id: 'circle3', name: 'Horror Fans' }
      ],
      tmdbId: '760161',
      type: 'movie',
      title: 'Orphan: First Kill',
      year: '2022',
      rating: 3,
      comment: 'A surprisingly fun prequel! If you loved the twist in the first movie, this one has some great moments too.',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      watchedAt: null,
      providers: ['Hulu', 'Prime Video'],
      playableOnMyServices: true,
      playableOn: ['Hulu', 'Prime Video'],
      likeCount: 12,
      commentCount: 5,
      posterUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400'
    },
    {
      _id: '3',
      author: { 
        id: 'user3', 
        name: 'Emma Thompson', 
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
      },
      circles: [
        { id: 'circle4', name: 'Drama Club' },
        { id: 'circle5', name: 'HBO Originals' }
      ],
      tmdbId: '100088',
      type: 'tv',
      title: 'The Last of Us',
      year: '2023',
      rating: 5,
      comment: 'This adaptation is phenomenal! Pedro Pascal and Bella Ramsey have incredible chemistry. Episode 3 made me cry.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      watchedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      providers: ['HBO Max'],
      playableOnMyServices: true,
      playableOn: ['HBO Max'],
      likeCount: 45,
      commentCount: 18,
      posterUrl: 'https://images.unsplash.com/photo-1574268438462-201fc53fef85?w=400'
    },
    {
      _id: '4',
      author: { 
        id: 'user4', 
        name: 'Alex Kumar', 
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200'
      },
      circles: [
        { id: 'circle1', name: 'Sci-Fi Lovers' }
      ],
      tmdbId: '569094',
      type: 'movie',
      title: 'Spider-Man: Across the Spider-Verse',
      year: '2023',
      rating: 5,
      comment: 'Absolutely mind-blowing animation! Every frame is a work of art. The story and character development are top-notch.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      watchedAt: null,
      providers: ['Netflix', 'Prime Video'],
      playableOnMyServices: false,
      playableOn: [],
      likeCount: 67,
      commentCount: 23,
      posterUrl: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400'
    },
    {
      _id: '5',
      author: { 
        id: 'user5', 
        name: 'Jessica Park', 
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
      },
      circles: [
        { id: 'circle6', name: 'Comedy Central' }
      ],
      tmdbId: '157336',
      type: 'tv',
      title: 'Ted Lasso',
      year: '2020',
      rating: 5,
      comment: 'The most wholesome show ever! Jason Sudeikis brings so much heart to this character. Believe! ⚽',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      watchedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      providers: ['Apple TV+'],
      playableOnMyServices: true,
      playableOn: ['Apple TV+'],
      likeCount: 89,
      commentCount: 31,
      posterUrl: 'https://images.unsplash.com/photo-1574267432644-f74f8ec55192?w=400'
    }
  ];

  return {
    items: mockPosts.slice(0, limit),
    nextCursor: limit < mockPosts.length ? 'mock-cursor-next' : null
  };
}

/**
 * Transform FeedPost to match existing UI PostCard props
 */
export function transformFeedPost(post: FeedPost): {
  id: string;
  author: {
    name: string;
    avatar?: string;
  };
  circles: string[];
  timestamp: string;
  media: {
    type: 'movie' | 'tv';
    title: string;
    year: string;
    poster: string;
  };
  rating: number;
  comment: string;
  services: Array<{
    name: string;
    available: boolean;
  }>;
  engagement: {
    likes: number;
    comments: number;
  };
} {
  return {
    id: post._id,
    author: {
      name: post.author.name,
      avatar: post.author.avatarUrl,
    },
    circles: post.circles.map(c => c.name),
    timestamp: formatTimestamp(post.createdAt),
    media: {
      type: post.type,
      title: post.title,
      year: post.year || '',
      poster: post.posterUrl || '',
    },
    rating: post.rating || 0,
    comment: post.comment || '',
    services: transformServices(post.playableOn),
    engagement: {
      likes: post.likeCount,
      comments: post.commentCount,
    },
  };
}

/**
 * Transform service names to UI format with availability
 */
function transformServices(playableOn: string[]) {
  const allServices = ['Netflix', 'Prime Video', 'Disney+', 'Hulu', 'HBO Max', 'Apple TV+'];
  
  return allServices.map(service => ({
    name: service,
    available: playableOn.includes(service),
  }));
}

/**
 * Format ISO timestamp to relative time
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Format as date for older posts
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Create a new post
 * POST /posts
 * @param payload - Post data including type, tmdbId, circles, rating, comment, watchedAt
 * @returns The newly created post
 */
export async function createPost(payload: CreatePostPayload): Promise<FeedPost> {
  try {
    const response = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create post');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Get user's circles
 * GET /circles
 * @returns List of circles the user belongs to
 */
export async function getUserCircles(): Promise<Circle[]> {
  // Use mock data if flag is set
  if (USE_MOCK_DATA) {
    return getMockCircles();
  }

  try {
    const response = await fetch(`${API_BASE}/circles`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn('Circles API returned error, using mock data');
      return getMockCircles();
    }

    const data = await response.json();
    return data.circles || data;
  } catch (error) {
    // Silently return mock data on error
    console.warn('Circles API unavailable, using mock data');
    return getMockCircles();
  }
}

/**
 * Mock circles for development
 */
function getMockCircles(): Circle[] {
  return [
    { id: '1', name: 'Movie Night Friends' },
    { id: '2', name: 'Roommates' },
    { id: '3', name: 'Marvel Fans' },
    { id: '4', name: 'Sci-Fi Club' },
  ];
}

/**
 * Search TMDB for movies and TV shows
 * GET /tmdb/search
 * @param query - Search query
 * @param type - 'movie', 'tv', or 'multi'
 * @returns Search results from TMDB
 */
export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv' | 'multi' = 'multi'
): Promise<TMDBResult[]> {
  try {
    const params = new URLSearchParams({
      query,
      type,
    });

    const response = await fetch(`${API_BASE}/tmdb/search?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn('TMDB search failed, using mock data');
      return getMockTMDBResults(query);
    }

    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return getMockTMDBResults(query);
  }
}

/**
 * Mock TMDB search results for development
 */
function getMockTMDBResults(query: string): TMDBResult[] {
  const lowerQuery = query.toLowerCase();
  const allResults: TMDBResult[] = [
    {
      id: 505642,
      title: 'Black Panther: Wakanda Forever',
      release_date: '2022-11-09',
      poster_path: '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg',
      media_type: 'movie',
    },
    {
      id: 569094,
      title: 'Spider-Man: Across the Spider-Verse',
      release_date: '2023-05-31',
      poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      media_type: 'movie',
    },
    {
      id: 100088,
      name: 'The Last of Us',
      first_air_date: '2023-01-15',
      poster_path: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      media_type: 'tv',
    },
    {
      id: 157336,
      name: 'Ted Lasso',
      first_air_date: '2020-08-14',
      poster_path: '/5fhZdwP1DVJ0FyVH6vrFdHwpXIn.jpg',
      media_type: 'tv',
    },
  ];

  // Filter based on query
  return allResults.filter(result => {
    const title = result.title || result.name || '';
    return title.toLowerCase().includes(lowerQuery);
  }).slice(0, 5);
}