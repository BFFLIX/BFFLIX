// mobile/src/components/feed/PostHeader.tsx

import React from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";
import { formatTimeAgo, getInitials } from "../../lib/utils";

type PostHeaderProps = {
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
  authorId?: string;
  currentUserId?: string;
  onDelete?: () => void;
};

export function PostHeader({
  authorName,
  authorAvatarUrl,
  circleNames,
  createdAt,
  authorId,
  currentUserId,
  onDelete,
}: PostHeaderProps) {
  const timeAgo = formatTimeAgo(createdAt);
  const circlesText = circleNames.length > 0 ? circleNames.join(", ") : "Unknown circle";
  const isOwnPost = authorId && currentUserId && authorId === currentUserId;

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.()
        },
      ]
    );
  };

  return (
    <View style={feedStyles.postHeader}>
      {/* Avatar */}
      <View style={feedStyles.avatar}>
        {authorAvatarUrl ? (
          <Image
            source={{ uri: authorAvatarUrl }}
            style={feedStyles.avatarImage}
          />
        ) : (
          <Text style={feedStyles.avatarText}>
            {getInitials(authorName)}
          </Text>
        )}
      </View>

      {/* Author Info */}
      <View style={feedStyles.postHeaderText}>
        <Text style={feedStyles.authorName}>{authorName}</Text>
        <Text style={feedStyles.circlesText}>
          Posted in: {circlesText}
        </Text>
        <Text style={feedStyles.timeText}>{timeAgo}</Text>
      </View>

      {/* Delete Button (only for own posts) */}
      {isOwnPost && onDelete && (
        <Pressable
          onPress={handleDeletePress}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: feedColors.borderLight,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: feedColors.error, fontWeight: "600" }}>
            Delete
          </Text>
        </Pressable>
      )}
    </View>
  );
}
