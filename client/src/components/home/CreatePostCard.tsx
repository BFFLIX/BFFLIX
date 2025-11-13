import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Star, X, CalendarIcon, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  createPost, 
  getUserCircles, 
  searchTMDB, 
  type Circle, 
  type TMDBResult,
  type CreatePostPayload,
  type FeedPost
} from '../../lib/feedApi';
import { format } from 'date-fns';

interface CreatePostCardProps {
  userAvatar?: string;
  userName: string;
  onPostCreated?: (post: FeedPost) => void;
  onCancel?: () => void;
}

/**
 * CreatePostCard Component
 * 
 * Allows users to create a new post by:
 * - Toggling between movie/TV
 * - Searching and selecting a TMDB title
 * - Rating with stars (optional)
 * - Adding a comment (max 1000 chars, optional)
 * - Selecting circles to post to
 * - Optionally setting when they watched it
 * 
 * On successful post creation, calls onPostCreated callback
 */
export function CreatePostCard({ userAvatar, userName, onPostCreated, onCancel }: CreatePostCardProps) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<TMDBResult | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [watchedAt, setWatchedAt] = useState<Date | undefined>(undefined);
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchRef = useRef<HTMLDivElement>(null);

  // Load user circles on mount
  useEffect(() => {
    const loadCircles = async () => {
      try {
        const userCircles = await getUserCircles();
        setCircles(userCircles);
      } catch (err) {
        console.error('Failed to load circles:', err);
      }
    };
    loadCircles();
  }, []);

  // Handle TMDB search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchTMDB(searchQuery, mediaType);
        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, mediaType]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCircleToggle = (circleId: string) => {
    setSelectedCircles((prev) =>
      prev.includes(circleId)
        ? prev.filter((id) => id !== circleId)
        : [...prev, circleId]
    );
  };

  const handleSelectTitle = (result: TMDBResult) => {
    setSelectedTitle(result);
    setSearchQuery(result.title || result.name || '');
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setSelectedTitle(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * handleCreatePost - Main post creation handler
   * 
   * 1. Validates required fields (title, circles)
   * 2. Constructs payload matching backend schema
   * 3. Calls POST /posts API endpoint
   * 4. On success: resets form and calls onPostCreated callback
   * 5. On failure: displays inline error message
   */
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

      // Add optional fields
      if (rating > 0) {
        payload.rating = rating;
      }

      if (comment.trim()) {
        payload.comment = comment.trim();
      }

      if (watchedAt) {
        payload.watchedAt = watchedAt.toISOString();
      }

      if (seasonNumber) {
        payload.seasonNumber = parseInt(seasonNumber, 10);
      }

      if (episodeNumber) {
        payload.episodeNumber = parseInt(episodeNumber, 10);
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
      setSeasonNumber('');
      setEpisodeNumber('');

      // Notify parent component
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

  const getYear = (result: TMDBResult) => {
    const date = result.release_date || result.first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
            {userName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          {/* Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMediaType('movie');
                setSelectedTitle(null);
                setSearchQuery('');
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-all',
                mediaType === 'movie'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              Movie
            </button>
            <button
              onClick={() => {
                setMediaType('tv');
                setSelectedTitle(null);
                setSearchQuery('');
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-all',
                mediaType === 'tv'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              Show
            </button>
          </div>

          {/* TMDB Search */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder={`Search for a ${mediaType === 'movie' ? 'movie' : 'show'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20 pl-10 pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
              )}
              {selectedTitle && (
                <button
                  onClick={handleClearSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectTitle(result)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      {result.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                          alt=""
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="text-white">
                          {result.title || result.name}
                        </div>
                        <div className="text-white/40 text-sm">
                          {getYear(result)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Season & Episode Numbers (TV Shows only) */}
          {mediaType === 'tv' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-white/60 text-sm mb-1.5 block">Season (optional)</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(e.target.value)}
                  min="1"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                />
              </div>
              <div className="flex-1">
                <label className="text-white/60 text-sm mb-1.5 block">Episode (optional)</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  min="1"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                />
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-5 h-5',
                      star <= rating
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-white/20'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <button
                onClick={() => setRating(0)}
                className="ml-2 text-white/40 hover:text-white text-sm"
              >
                Clear
              </button>
            )}
          </div>

          {/* Comment */}
          <div className="relative">
            <Textarea
              placeholder="Share your thoughts... (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20 resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-white/40">
              {comment.length}/1000
            </div>
          </div>

          {/* Watched At Date */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Watched on:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white',
                    !watchedAt && 'text-white/40'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedAt ? format(watchedAt, 'PPP') : 'Pick a date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-black/90 backdrop-blur-xl border-white/10">
                <Calendar
                  mode="single"
                  selected={watchedAt}
                  onSelect={setWatchedAt}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {watchedAt && (
              <button
                onClick={() => setWatchedAt(undefined)}
                className="text-white/40 hover:text-white text-sm"
              >
                Clear
              </button>
            )}
          </div>

          {/* Circle Selector */}
          <div>
            <span className="text-white/60 text-sm mb-2 block">Post to circles:</span>
            <div className="flex flex-wrap gap-2">
              {circles.map((circle) => (
                <Badge
                  key={circle.id}
                  variant={selectedCircles.includes(circle.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedCircles.includes(circle.id)
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 border-transparent'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                  )}
                  onClick={() => handleCircleToggle(circle.id)}
                >
                  {circle.name}
                  {selectedCircles.includes(circle.id) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Post Button */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleCreatePost}
              disabled={!selectedTitle || selectedCircles.length === 0 || isPosting}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white disabled:opacity-50"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}