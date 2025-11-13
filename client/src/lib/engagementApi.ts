// Engagement API Service
// Endpoints for likes and comments

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

export type Comment = {
  _id: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  text: string;
  createdAt: string;
};

export type LikeResponse = {
  liked: boolean;
  likeCount: number;
};

export type CommentsResponse = {
  comments: Comment[];
};

export type CreateCommentPayload = {
  text: string;
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Toggle like on a post
 * POST /posts/:id/like
 * @param postId - The ID of the post to like/unlike
 * @returns Updated like status and count
 */
export async function toggleLike(postId: string): Promise<LikeResponse> {
  if (USE_MOCK_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return getMockLikeResponse();
  }

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn('Like API failed, using mock data');
      await new Promise(resolve => setTimeout(resolve, 300));
      return getMockLikeResponse();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Like API unavailable, using mock data');
    await new Promise(resolve => setTimeout(resolve, 300));
    return getMockLikeResponse();
  }
}

/**
 * Get comments for a post
 * GET /posts/:id/comments
 * @param postId - The ID of the post
 * @returns List of comments
 */
export async function getComments(postId: string): Promise<CommentsResponse> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockComments();
  }

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn('Comments API failed, using mock data');
      await new Promise(resolve => setTimeout(resolve, 500));
      return getMockComments();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Comments API unavailable, using mock data');
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockComments();
  }
}

/**
 * Create a comment on a post
 * POST /posts/:id/comments
 * @param postId - The ID of the post
 * @param payload - Comment data (text max 1000 chars)
 * @returns The newly created comment
 */
export async function createComment(
  postId: string,
  payload: CreateCommentPayload
): Promise<Comment> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return getMockNewComment(payload.text);
  }

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create comment');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

// ============================================================================
// MOCK DATA
// ============================================================================

function getMockLikeResponse(): LikeResponse {
  // Randomly toggle like state for demo
  const liked = Math.random() > 0.5;
  return {
    liked,
    likeCount: Math.floor(Math.random() * 50) + 10,
  };
}

function getMockComments(): CommentsResponse {
  return {
    comments: [
      {
        _id: 'comment1',
        author: {
          id: 'user1',
          name: 'Alex Johnson',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
        },
        text: 'This was amazing! I watched it last night and can\'t stop thinking about it.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: 'comment2',
        author: {
          id: 'user2',
          name: 'Maria Garcia',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
        },
        text: 'Thanks for the recommendation! Adding this to my watchlist 🍿',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: 'comment3',
        author: {
          id: 'user3',
          name: 'David Kim',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
        },
        text: 'Have you seen the sequel? It\'s even better!',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  };
}

function getMockNewComment(text: string): Comment {
  return {
    _id: `comment-${Date.now()}`,
    author: {
      id: 'currentUser',
      name: 'You',
      avatarUrl: undefined,
    },
    text,
    createdAt: new Date().toISOString(),
  };
}
