import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Heart, MessageCircle, Bookmark, Star, Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toggleLike, getComments, createComment, type Comment } from '../../lib/engagementApi';
import { Textarea } from '../ui/textarea';

interface PostCardProps {
  post: {
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
}

const serviceColors: Record<string, string> = {
  Netflix: 'bg-red-600',
  'Prime Video': 'bg-blue-500',
  'Disney+': 'bg-blue-400',
  Hulu: 'bg-green-500',
  'HBO Max': 'bg-purple-600',
  'Apple TV+': 'bg-gray-700',
};

// Format timestamp
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.engagement.likes);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleLike = async () => {
    // Optimistic update
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      const result = await toggleLike(post.id);
      // Update with actual server response
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (error) {
      // Revert on error
      setLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
    }
  };

  const handleToggleComments = async () => {
    if (!commentsExpanded && comments.length === 0) {
      // Load comments for the first time
      setLoadingComments(true);
      try {
        const result = await getComments(post.id);
        setComments(result.comments);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    }
    setCommentsExpanded(!commentsExpanded);
  };

  const handleSubmitComment = async () => {
    const trimmedText = newCommentText.trim();
    if (!trimmedText || trimmedText.length > 1000) return;

    setSubmittingComment(true);
    try {
      const newComment = await createComment(post.id, { text: trimmedText });
      setComments(prev => [...prev, newComment]);
      setNewCommentText('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              {post.author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white">{post.author.name}</p>
            <p className="text-white/50 text-sm">
              Posted in: {post.circles.join(', ')}
            </p>
          </div>
        </div>
        <span className="text-white/40 text-sm">{post.timestamp}</span>
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* Poster */}
        <div className="flex-shrink-0">
          <ImageWithFallback
            src={post.media.poster}
            alt={post.media.title}
            className="w-32 h-48 object-cover rounded-lg"
          />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          {/* Title & Type */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white">
                {post.media.title} ({post.media.year})
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  'border-white/20',
                  post.media.type === 'movie' ? 'text-red-400' : 'text-blue-400'
                )}
              >
                {post.media.type === 'movie' ? 'Movie' : 'TV'}
              </Badge>
            </div>

            {/* Rating */}
            {post.rating > 0 && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-4 h-4',
                      star <= post.rating
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-white/20'
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Comment */}
          {post.comment && (
            <p className="text-white/80 text-sm leading-relaxed">{post.comment}</p>
          )}

          {/* Streaming Services */}
          <div className="flex flex-wrap gap-2">
            {post.services.map((service) => (
              <Badge
                key={service.name}
                className={cn(
                  'text-xs',
                  service.available
                    ? `${serviceColors[service.name] || 'bg-gray-600'} text-white`
                    : 'bg-white/5 text-white/30 border border-white/10'
                )}
              >
                {service.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement Row */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn(
            'text-white/60 hover:text-white hover:bg-white/5 transition-all',
            liked && 'text-red-500 hover:text-red-400'
          )}
        >
          <Heart className={cn('w-4 h-4 mr-1 transition-all', liked && 'fill-current scale-110')} />
          {likeCount}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleComments}
          className={cn(
            'text-white/60 hover:text-white hover:bg-white/5',
            commentsExpanded && 'text-blue-400'
          )}
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {post.engagement.comments + comments.length}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBookmarked(!bookmarked)}
          className={cn(
            'text-white/60 hover:text-white hover:bg-white/5 ml-auto',
            bookmarked && 'text-purple-500 hover:text-purple-400'
          )}
        >
          <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
        </Button>
      </div>

      {/* Comments Section - Expandable */}
      {commentsExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Comment Input */}
          <div className="flex gap-2">
            <Textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={1000}
              className="flex-1 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus-visible:border-purple-500/50 resize-none min-h-[80px]"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newCommentText.trim() || submittingComment}
              size="sm"
              className="self-end bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Character count */}
          {newCommentText.length > 0 && (
            <p className={cn(
              "text-xs text-right",
              newCommentText.length > 900 ? "text-red-400" : "text-white/40"
            )}>
              {newCommentText.length}/1000
            </p>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 animate-in slide-in-from-left-2 duration-200">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.author.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs">
                      {comment.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm">{comment.author.name}</p>
                      <span className="text-white/40 text-xs">
                        {formatTimestamp(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
