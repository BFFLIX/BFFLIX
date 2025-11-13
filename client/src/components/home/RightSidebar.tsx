import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, TrendingUp, Star, AlertCircle, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getCircles, type Circle } from '../../lib/circlesApi';
import { Skeleton } from '../ui/skeleton';

interface RightSidebarProps {
  onOpenAI: () => void;
}

const recentlyWatched = [
  {
    id: '1',
    title: 'Inception',
    poster: 'https://images.unsplash.com/photo-1587555009307-4b73aaab7d9c?w=200',
    rating: 5,
  },
  {
    id: '2',
    title: 'Dune',
    poster: 'https://images.unsplash.com/photo-1667757635625-ed2aed238b42?w=200',
    rating: 4,
  },
  {
    id: '3',
    title: 'Oppenheimer',
    poster: 'https://images.unsplash.com/photo-1715305278832-4e4a15d1a083?w=200',
    rating: 5,
  },
];

const aiPrompts = [
  'What should I watch tonight?',
  'Suggest something like Inception',
  'Cozy TV shows on my services',
];

/**
 * RightSidebar Component
 * 
 * DATA FETCHING:
 * - Fetches circles data from GET /circles on mount
 * - Shows loading skeletons during fetch
 * - Displays error state if fetch fails
 * - Renders circles with member count
 * 
 * API INTEGRATION:
 * - Endpoint: GET /circles (authenticated)
 * - Response: { circles: Array<{ id, name, members }> }
 * - Mock data available in circlesApi.ts (USE_MOCK_DATA flag)
 */
export function RightSidebar({ onOpenAI }: RightSidebarProps) {
  // STATE: Circles data fetching
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [circlesError, setCirclesError] = useState(false);

  /**
   * EFFECT: Fetch circles on component mount
   * - Calls GET /circles with auth token
   * - Updates circles state on success
   * - Sets error state on failure
   */
  useEffect(() => {
    const fetchCircles = async () => {
      setLoadingCircles(true);
      setCirclesError(false);
      try {
        const response = await getCircles();
        setCircles(response.circles);
      } catch (error) {
        console.error('Failed to load circles:', error);
        setCirclesError(true);
      } finally {
        setLoadingCircles(false);
      }
    };

    fetchCircles();
  }, []);

  const handleRetryCircles = async () => {
    setLoadingCircles(true);
    setCirclesError(false);
    try {
      const response = await getCircles();
      setCircles(response.circles);
    } catch (error) {
      console.error('Failed to load circles:', error);
      setCirclesError(true);
    } finally {
      setLoadingCircles(false);
    }
  };

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* ==================== CIRCLES SECTION ==================== */}
        {/* 
          API: GET /circles
          Shows user's circles with member counts
          States: loading skeleton → data/error
        */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Circles
            </h2>
          </div>

          {/* LOADING STATE: Show skeletons while fetching */}
          {loadingCircles && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  className="h-16 rounded-lg bg-white/5"
                />
              ))}
            </div>
          )}

          {/* ERROR STATE: Show error message with retry button */}
          {!loadingCircles && circlesError && (
            <div className="p-4 rounded-lg bg-red-600/10 border border-red-600/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 text-sm mb-2">
                    Failed to load circles
                  </p>
                  <Button
                    onClick={handleRetryCircles}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS STATE: Display circles */}
          {!loadingCircles && !circlesError && circles.length > 0 && (
            <>
              <div className="space-y-3">
                {circles.slice(0, 4).map((circle) => (
                  <div
                    key={circle.id}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-white text-sm">{circle.name}</p>
                    </div>
                    <p className="text-white/50 text-xs">{circle.members} members</p>
                  </div>
                ))}
              </div>
              {circles.length > 4 && (
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-white/5"
                >
                  View all {circles.length} circles
                </Button>
              )}
            </>
          )}

          {/* EMPTY STATE: No circles */}
          {!loadingCircles && !circlesError && circles.length === 0 && (
            <div className="p-4 rounded-lg bg-white/5 text-center">
              <p className="text-white/60 text-sm mb-2">No circles yet</p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-xs"
              >
                Join a circle
              </Button>
            </div>
          )}
        </div>

        {/* ==================== AI RECOMMENDATIONS ==================== */}
        {/* 
          Interactive section to open AI chat drawer
          Provides quick prompts for common queries
        */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-600/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="text-white">AI Recommendations</h2>
          </div>
          <p className="text-white/60 text-sm mb-4">
            Ask the BFFlix AI for movie and TV recommendations tailored to your taste.
          </p>
          <div className="space-y-2 mb-4">
            {aiPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={onOpenAI}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
              >
                "{prompt}"
              </button>
            ))}
          </div>
          <Button
            onClick={onOpenAI}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            Open AI Assistant
          </Button>
        </div>

        {/* ==================== RECENTLY WATCHED ==================== */}
        {/* 
          Shows user's recent viewing history
          TODO: Connect to real API endpoint when available
        */}
        <div>
          <h2 className="text-white mb-4">Recently Watched</h2>
          <div className="space-y-3">
            {recentlyWatched.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ImageWithFallback
                  src={item.poster}
                  alt={item.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-white text-sm mb-1">{item.title}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= item.rating
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
