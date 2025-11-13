import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, Sparkles, AlertCircle, Plus } from 'lucide-react';
import { Header } from '../components/home/Header';
import { LeftSidebar } from '../components/home/LeftSidebar';
import { CreatePostCard } from '../components/home/CreatePostCard';
import { PostCard } from '../components/home/PostCard';
import { RightSidebar } from '../components/home/RightSidebar';
import { AIChatDrawer } from '../components/home/AIChatDrawer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import { loadFeed, transformFeedPost, type FeedPost } from '../lib/feedApi';

/**
 * ============================================================================
 * HOME PAGE - COMPLETE API INTEGRATION DOCUMENTATION
 * ============================================================================
 * 
 * This page integrates with multiple backend APIs:
 * 
 * 1. FEED API (feedApi.ts)
 *    - GET /feed?cursor={cursor}&limit={limit}
 *    - Initial load: cursor=null, limit=20
 *    - Infinite scroll: uses nextCursor from previous response
 *    - Returns: { items: FeedPost[], nextCursor: string | null }
 *    - State: loading → data/error
 *    - Infinite scroll: IntersectionObserver on observerTarget div
 * 
 * 2. CREATE POST API (feedApi.ts)
 *    - POST /posts
 *    - Payload: { type, tmdbId, circles, rating?, comment?, watchedAt? }
 *    - On success: new post prepended to feed via handlePostCreated callback
 *    - State: isPosting → success/error
 *    - Error handling: inline error message in CreatePostCard
 * 
 * 3. ENGAGEMENT API (engagementApi.ts)
 *    - POST /posts/:id/like - Toggle like (optimistic update)
 *    - GET /posts/:id/comments - Load comments when expanded
 *    - POST /posts/:id/comments - Create comment (appended to list)
 *    - Used by: PostCard component
 * 
 * 4. CIRCLES API (circlesApi.ts)
 *    - GET /circles - Fetch user's circles
 *    - Used by: RightSidebar component
 *    - State: loadingCircles → data/error with retry
 * 
 * 5. AI AGENT API (agentApi.ts)
 *    - POST /agent/recommendations
 *    - Multi-turn conversation with conversationId
 *    - Request: { query, limit, preferFeed, conversationId, history }
 *    - Response: { results: Array<RecommendationItem | ConversationMessage> }
 *    - Used by: AIChatDrawer component
 *    - Shows "Thinking..." loader while processing
 * 
 * STATE MANAGEMENT:
 * - posts: UIPost[] - Transformed feed items
 * - loading: boolean - Initial feed load
 * - error: boolean - Feed load error
 * - loadingMore: boolean - Pagination loading
 * - nextCursor: string | null - For pagination
 * - hasMore: boolean - Whether more posts available
 * - showCreatePost: boolean - Toggle create post form
 * - aiDrawerOpen: boolean - AI chat drawer visibility
 * 
 * UI FLOWS:
 * 1. Initial Load → Loading skeletons → Feed display
 * 2. Infinite Scroll → Load more indicator → Append posts
 * 3. Create Post → Button click → Form expand → Submit → Prepend to feed → Collapse
 * 4. Like/Comment → Optimistic update → API call → Update state
 * 5. AI Chat → Open drawer → Send message → Thinking indicator → Show results
 * 
 * ERROR STATES:
 * - Feed load error: Full-page error with retry button
 * - Create post error: Inline error message
 * - Pagination error: Silent (logged to console)
 * - Circles error: Sidebar error with retry
 * - AI error: Error bubble in chat
 */

// Mock user data
const currentUser = {
  name: 'Alex Johnson',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
};

// UI Post type matching PostCard props
type UIPost = {
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
};

type FilterTab = 'all' | 'circles' | 'mine';
type SortOption = 'newest' | 'highest' | 'active';

const streamingServices = ['All services', 'Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+'];

export default function Home() {
  const navigate = useNavigate();
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedService, setSelectedService] = useState('All services');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [posts, setPosts] = useState<UIPost[]>([]);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    navigate('/auth');
  };

  const handleNavClick = (id: string) => {
    setActiveNavItem(id);
    if (id === 'ai') {
      setAiDrawerOpen(true);
    }
  };

  /**
   * handlePostCreated - Callback when a new post is created
   * Prepends the new post to the feed
   */
  const handlePostCreated = useCallback((newPost: FeedPost) => {
    // Transform the new post to UI format
    const uiPost = transformFeedPost(newPost);
    // Prepend to feed
    setPosts((prevPosts) => [uiPost, ...prevPosts]);
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const feedResponse = await loadFeed(null, 20);
      const transformedPosts: UIPost[] = feedResponse.items.map((item) => transformFeedPost(item));
      setPosts(transformedPosts);
      setNextCursor(feedResponse.nextCursor || null);
      setHasMore(!!feedResponse.nextCursor);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const fetchMorePosts = useCallback(async () => {
    if (!nextCursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const feedResponse = await loadFeed(nextCursor, 20);
      const transformedPosts = feedResponse.items.map(transformFeedPost);
      setPosts((prevPosts) => [...prevPosts, ...transformedPosts]);
      setNextCursor(feedResponse.nextCursor || null);
      setHasMore(!!feedResponse.nextCursor);
    } catch (err) {
      console.error('Error loading more posts:', err);
      // Don't set error state for pagination failures
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, hasMore, loadingMore]);

  useEffect(() => {
    const currentRef = observerTarget.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [fetchMorePosts, hasMore, loadingMore]);

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Animated Background Circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(147, 51, 234, 0) 70%)',
            filter: 'blur(80px)',
          }}
          animate={{
            x: ['-20%', '0%', '-20%'],
            y: ['-10%', '10%', '-10%'],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '-20%', y: '-10%' }}
        />
        <motion.div
          className="absolute w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(219, 39, 119, 0.15) 0%, rgba(219, 39, 119, 0) 70%)',
            filter: 'blur(80px)',
            right: 0,
            top: '20%',
          }}
          animate={{
            x: ['20%', '0%', '20%'],
            y: ['0%', '20%', '0%'],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '20%', y: '0%' }}
        />
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0) 70%)',
            filter: 'blur(80px)',
            bottom: '10%',
            left: '30%',
          }}
          animate={{
            x: ['-10%', '10%', '-10%'],
            y: ['0%', '-10%', '0%'],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '-10%', y: '0%' }}
        />
      </div>

      {/* Header */}
      <Header
        userName={currentUser.name}
        userAvatar={currentUser.avatar}
        onLogout={handleLogout}
      />

      {/* Left Sidebar */}
      <LeftSidebar
        activeItem={activeNavItem}
        onItemClick={handleNavClick}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="relative z-10 ml-64 mr-80 pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Create Post Button */}
          {!showCreatePost && (
            <div className="mb-6">
            </div>
          )}

          {/* Create Post Card - Collapsible */}
          {showCreatePost && (
            <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
              <CreatePostCard
                userName={currentUser.name}
                userAvatar={currentUser.avatar}
                onPostCreated={(newPost) => {
                  handlePostCreated(newPost);
                  setShowCreatePost(false); // Close after posting
                }}
                onCancel={() => setShowCreatePost(false)}
              />
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterTab('all')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-all',
                    filterTab === 'all'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  All posts
                </button>
                <button
                  onClick={() => setFilterTab('circles')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-all',
                    filterTab === 'circles'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  My circles
                </button>
                <button
                  onClick={() => setFilterTab('mine')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-all',
                    filterTab === 'mine'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  My posts
                </button>
              </div>
              
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white transition-all"
              >
                <Plus className="w-4 h-4" />
                Post
              </button>
            </div>

            {/* Service & Sort Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {streamingServices.map((service) => (
                <Badge
                  key={service}
                  variant={selectedService === service ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedService === service
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 border-transparent'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                  )}
                  onClick={() => setSelectedService(service)}
                >
                  {service}
                </Badge>
              ))}
              
              <div className="ml-auto flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-red-600/50 focus:ring-red-600/20 focus:outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                  <option value="active">Most active</option>
                </select>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-white mb-2">Failed to load posts</h3>
                <p className="text-white/60 text-sm mb-6 text-center max-w-md">
                  Please try again later.
                </p>
                <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white" onClick={fetchFeed}>
                  Retry
                </Button>
              </div>
            ) : posts.length > 0 ? (
              <>
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-white mb-2">No posts yet</h3>
                <p className="text-white/60 text-sm mb-6 text-center max-w-md">
                  Create your first post or join a circle to see what your friends are watching.
                </p>
                <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white">
                  Create a post
                </Button>
              </div>
            )}
          </div>

          {/* Infinite Scroll Observer Target */}
          {hasMore && !loading && posts.length > 0 && (
            <div
              ref={observerTarget}
              className="h-10"
            />
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar onOpenAI={() => setAiDrawerOpen(true)} />

      {/* AI Chat Drawer */}
      <AIChatDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

      {/* Floating AI Button */}
      {!aiDrawerOpen && (
        <button
          onClick={() => setAiDrawerOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 z-50"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}