// mobile/src/components/feed/CommentItem.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";
import { formatTimeAgo } from "../../lib/utils";
import type { FeedComment } from "../../types/feed";

type CommentItemProps = {
  comment: FeedComment;
  currentUserId?: string;
  onDelete?: () => void;
};

export function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: CommentItemProps) {
  const canDelete = currentUserId && currentUserId === comment.userId;
  const timeAgo = formatTimeAgo(comment.createdAt);

  return (
    <View style={feedStyles.commentItem}>
      {/* Comment Header */}
      <View style={feedStyles.commentHeader}>
        <Text style={feedStyles.commentUserId}>{comment.userId}</Text>
        <Text style={feedStyles.commentTime}>{timeAgo}</Text>
        {canDelete && onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: feedColors.error, fontSize: 13, marginLeft: 8 }}>
              Delete
            </Text>
          </Pressable>
        )}
      </View>

      {/* Comment Text */}
      <Text style={feedStyles.commentText}>{comment.text}</Text>
    </View>
  );
}
