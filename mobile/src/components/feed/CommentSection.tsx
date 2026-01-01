// mobile/src/components/feed/CommentSection.tsx

import React from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { useComments } from "../../hooks/useComments";

type CommentSectionProps = {
  postId: string;
  currentUserId?: string;
  onCommentCountChange?: (newCount: number) => void;
};

export function CommentSection({
  postId,
  currentUserId,
  onCommentCountChange,
}: CommentSectionProps) {
  const { comments, isLoading, isExpanded, isSubmitting, toggle, add, remove } =
    useComments(postId);

  const handleAddComment = async (text: string) => {
    await add(text);
    // Notify parent component of count change
    if (onCommentCountChange) {
      onCommentCountChange(comments.length + 1);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await remove(commentId);
    // Notify parent component of count change
    if (onCommentCountChange) {
      onCommentCountChange(comments.length - 1);
    }
  };

  // Don't render if not expanded
  if (!isExpanded) {
    return null;
  }

  return (
    <View style={feedStyles.commentsSection}>
      {/* Loading State */}
      {isLoading ? (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <ActivityIndicator size="small" color={feedColors.primary} />
          <Text style={{ color: feedColors.textSecondary, marginTop: 8, fontSize: 13 }}>
            Loading comments...
          </Text>
        </View>
      ) : (
        <>
          {/* Comments List */}
          {comments.length > 0 ? (
            <View style={feedStyles.commentsList}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onDelete={() => handleDeleteComment(comment.id)}
                />
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: feedColors.textSecondary,
                fontSize: 14,
                marginBottom: 12,
                fontStyle: "italic",
              }}
            >
              No comments yet. Be the first!
            </Text>
          )}

          {/* Add Comment Input */}
          <CommentInput onSubmit={handleAddComment} isSubmitting={isSubmitting} />
        </>
      )}

      {/* Collapse Button */}
      <Pressable
        onPress={toggle}
        style={{
          paddingVertical: 8,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <Text style={{ color: feedColors.textSecondary, fontSize: 13 }}>
          Hide comments
        </Text>
      </Pressable>
    </View>
  );
}
