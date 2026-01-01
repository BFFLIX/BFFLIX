// mobile/src/components/feed/PostHeader.tsx

import React from "react";
import { View, Text, Image } from "react-native";
import { feedStyles } from "../../styles/feedStyles";
import { formatTimeAgo, getInitials } from "../../lib/utils";

type PostHeaderProps = {
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
};

export function PostHeader({
  authorName,
  authorAvatarUrl,
  circleNames,
  createdAt,
}: PostHeaderProps) {
  const timeAgo = formatTimeAgo(createdAt);
  const circlesText = circleNames.length > 0 ? circleNames.join(", ") : "Unknown circle";

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
    </View>
  );
}
