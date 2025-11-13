# Create Post API Integration Documentation

## Overview
The Create Post card has been fully wired to the BFFlix backend API at `POST /posts`. Users can now search for movies/TV shows via TMDB, select circles, add ratings and comments, and create posts that immediately appear in their feed.

---

## Component: CreatePostCard

**Location:** `/components/home/CreatePostCard.tsx`

### Features Implemented

1. **Type Toggle** (Movie/TV)
   - User can switch between searching for movies or TV shows
   - Resets search results when toggled

2. **TMDB Search**
   - Real-time search with 300ms debounce
   - Displays poster thumbnails and release years
   - Click-to-select from dropdown results
   - Shows loading spinner during search
   - Falls back to mock data if API fails

3. **Rating Stars**
   - Optional 1-5 star rating
   - Click to select, click again to clear
   - Visual feedback with yellow stars

4. **Comment Field**
   - Optional text area with 1000 character limit
   - Character counter displayed
   - Validates max length before submission

5. **Watched At Date**
   - Optional date picker via calendar popover
   - Cannot select future dates
   - Displays formatted date when selected

6. **Circle Selection**
   - Fetches user's circles from backend
   - Multi-select with visual badges
   - Required field (at least one circle)

7. **Validation & Error Handling**
   - Validates required fields (title, circles)
   - Displays inline error messages
   - Shows loading state during submission

8. **Success Flow**
   - Resets all form fields on successful post
   - Calls `onPostCreated` callback to update feed
   - New post immediately appears at top of feed

---

## API Functions

**Location:** `/lib/feedApi.ts`

### 1. createPost()

```typescript
export async function createPost(payload: CreatePostPayload): Promise<FeedPost>
```

**Endpoint:** `POST /posts`

**Payload Schema:**
```typescript
{
  type: "movie" | "tv";          // Required
  tmdbId: string;                 // Required
  circles: string[];              // Required (array of circle IDs)
  rating?: number;                // Optional (1-5)
  comment?: string;               // Optional (max 1000 chars)
  watchedAt?: string;             // Optional (ISO date string)
}
```

**Example Request:**
```json
{
  "type": "movie",
  "tmdbId": "505642",
  "circles": ["circle1", "circle2"],
  "rating": 4,
  "comment": "Amazing sequel!",
  "watchedAt": "2024-11-10T00:00:00.000Z"
}
```

**Response:** Returns the newly created `FeedPost` object

**Error Handling:**
- Throws error with message from backend
- Component displays inline error message
- Mock data not used (real API call only)

---

### 2. searchTMDB()

```typescript
export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv' | 'multi' = 'multi'
): Promise<TMDBResult[]>
```

**Endpoint:** `GET /tmdb/search?query={query}&type={type}`

**Returns:** Array of TMDB results with:
- `id` - TMDB ID
- `title` or `name` - Title of movie/show
- `release_date` or `first_air_date` - Release date
- `poster_path` - Poster image path (use `https://image.tmdb.org/t/p/w92{poster_path}`)
- `media_type` - 'movie' or 'tv'

**Fallback:** Returns mock data if API fails (for development)

---

### 3. getUserCircles()

```typescript
export async function getUserCircles(): Promise<Circle[]>
```

**Endpoint:** `GET /circles`

**Returns:** Array of circles:
```typescript
{
  id: string;
  name: string;
}
```

**Fallback:** Returns mock circles if API fails

---

## Integration Flow

### In Home.tsx

```typescript
// Callback to handle new post creation
const handlePostCreated = useCallback((newPost: FeedPost) => {
  // Transform backend response to UI format
  const uiPost = transformFeedPost(newPost);
  // Prepend to feed (newest first)
  setPosts((prevPosts) => [uiPost, ...prevPosts]);
}, []);

// Pass callback to CreatePostCard
<CreatePostCard
  userName={currentUser.name}
  userAvatar={currentUser.avatar}
  onPostCreated={handlePostCreated}
/>
```

### User Flow

1. User toggles Movie/TV type
2. User searches for a title (300ms debounce)
3. Results appear in dropdown with posters
4. User clicks a result to select it
5. User optionally:
   - Adds star rating
   - Writes a comment
   - Selects watched date
6. User selects at least one circle (required)
7. User clicks "Post" button
8. API call to `POST /posts` with payload
9. On success:
   - Form resets to empty state
   - New post appears at top of feed
   - User sees their post immediately
10. On failure:
   - Error message displays below form
   - User can fix issues and retry

---

## Key Implementation Details

### handleCreatePost() in CreatePostCard

```typescript
const handleCreatePost = async () => {
  setError(null);

  // Validation
  if (!selectedTitle) {
    setError('Please select a title');
    return;
  }

  if (selectedCircles.length === 0) {
    setError('Please select at least one circle');
    return;
  }

  if (comment.length > 1000) {
    setError('Comment must be 1000 characters or less');
    return;
  }

  setIsPosting(true);

  try {
    // Construct payload
    const payload: CreatePostPayload = {
      type: mediaType,
      tmdbId: selectedTitle.id.toString(),
      circles: selectedCircles,
    };

    // Add optional fields only if present
    if (rating > 0) {
      payload.rating = rating;
    }

    if (comment.trim()) {
      payload.comment = comment.trim();
    }

    if (watchedAt) {
      payload.watchedAt = watchedAt.toISOString();
    }

    // Make API call
    const newPost = await createPost(payload);

    // Success! Reset form
    setSelectedTitle(null);
    setSearchQuery('');
    setRating(0);
    setComment('');
    setSelectedCircles([]);
    setWatchedAt(undefined);

    // Notify parent to update feed
    if (onPostCreated) {
      onPostCreated(newPost);
    }
  } catch (err) {
    console.error('Failed to create post:', err);
    setError(err instanceof Error ? err.message : 'Failed to create post. Please try again.');
  } finally {
    setIsPosting(false);
  }
};
```

---

## Authentication

All API calls use the `getAuthToken()` helper which retrieves the JWT from `localStorage.getItem('bfflix_token')` and includes it in the `Authorization: Bearer {token}` header.

**Note:** Make sure the auth token is stored properly after login for the API calls to work.

---

## Mock Data

For development without backend access:

- **TMDB Search:** Returns 4 mock movies/TV shows filtered by query
- **User Circles:** Returns 4 mock circles
- **Create Post:** Will throw error (no mock for POST operations)

---

## Future Enhancements

Potential improvements for later:

1. **Image Upload:** Allow users to upload custom images for posts
2. **Spoiler Tags:** Add spoiler warning checkbox
3. **Friend Tagging:** Tag friends who watched with you
4. **Draft Saving:** Auto-save drafts as user types
5. **Edit Post:** Allow editing of posted content
6. **Delete Post:** Allow deletion of own posts
7. **TMDB Details:** Show more metadata (genre, synopsis) in search results
8. **Recent Searches:** Cache and display recent TMDB searches

---

## Testing Checklist

- [x] Type toggle switches between movie/TV
- [x] TMDB search displays results
- [x] Search debounces properly (300ms)
- [x] User can select a title from dropdown
- [x] Rating stars work (click to set, click to clear)
- [x] Comment character counter updates
- [x] Date picker prevents future dates
- [x] Circle badges toggle on/off
- [x] Validation prevents submit without title
- [x] Validation prevents submit without circles
- [x] Loading spinner shows during API call
- [x] Error message displays on failure
- [x] Form resets after successful post
- [x] New post appears in feed immediately
- [x] Auth token included in API headers
