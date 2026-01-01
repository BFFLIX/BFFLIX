// mobile/src/components/feed/FeedPost.tsx

import React, { useState } from "react";
import { View } from "react-native";
import { feedStyles } from "../../styles/feedStyles";
import { PostHeader } from "./PostHeader";
import { PostContent } from "./PostContent";
import { PostActions } from "./PostActions";
import { CommentSection } from "./CommentSection";
import type { FeedPost as FeedPostType } from "../../types/feed";

type FeedPostProps = {
  post: FeedPostType;
  currentUserId?: string;
  onLike: (postId: string, currentLikedState: boolean) => void;
  onDelete?: (postId: string) => void;
};

export function FeedPost({
  post,
  currentUserId,
  onLike,
  onDelete,
}: FeedPostProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const handleLike = () => {
    onLike(post.id, post.likedByMe || false);
  };

  const handleCommentToggle = () => {
    setCommentsExpanded(!commentsExpanded);
  };

  const handleCommentCountChange = (newCount: number) => {
    setCommentCount(newCount);
  };

  return (
    <View style={feedStyles.postCard}>
      <View style={feedStyles.postCardInner}>
        {/* Post Header */}
        <PostHeader
          authorName={post.authorName}
          authorAvatarUrl={post.authorAvatarUrl}
          circleNames={post.circleNames}
          createdAt={post.createdAt}
        />

        {/* Post Content */}
        <PostContent post={post} />

        {/* Post Actions */}
        <PostActions
          likeCount={post.likeCount}
          commentCount={commentCount}
          likedByMe={post.likedByMe}
          onLike={handleLike}
          onComment={handleCommentToggle}
        />

        {/* Comments Section (conditionally rendered) */}
        {commentsExpanded && (
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </View>
    </View>
  );
}
