// mobile/src/components/feed/CommentItem.tsx

import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
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
  const displayName = comment.userName || comment.userId;

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(),
        },
      ]
    );
  };

  return (
    <View style={feedStyles.commentItem}>
      {/* Comment Header */}
      <View style={feedStyles.commentHeader}>
        <Text style={feedStyles.commentUserId}>{displayName}</Text>
        <Text style={feedStyles.commentTime}>{timeAgo}</Text>
        {canDelete && onDelete && (
          <Pressable
            onPress={handleDeletePress}
            style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: feedColors.borderLight,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: feedColors.error, fontSize: 11, fontWeight: "600" }}>
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
