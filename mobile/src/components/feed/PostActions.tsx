// mobile/src/components/feed/PostActions.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";

type PostActionsProps = {
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  onLike: () => void;
  onComment: () => void;
};

export function PostActions({
  likeCount,
  commentCount,
  likedByMe,
  onLike,
  onComment,
}: PostActionsProps) {
  return (
    <View style={feedStyles.postActions}>
      {/* Like Button */}
      <Pressable
        onPress={onLike}
        style={[
          feedStyles.actionButton,
          likedByMe && feedStyles.actionButtonActive,
        ]}
      >
        <Text
          style={[
            feedStyles.actionIcon,
            { fontSize: 18, color: likedByMe ? feedColors.likeActive : feedColors.textSecondary },
          ]}
        >
          👍
        </Text>
        <Text
          style={[
            feedStyles.actionText,
            likedByMe && feedStyles.actionTextActive,
          ]}
        >
          {likeCount > 0 ? likeCount : "Like"}
        </Text>
      </Pressable>

      {/* Comment Button */}
      <Pressable onPress={onComment} style={feedStyles.actionButton}>
        <Text
          style={[
            feedStyles.actionIcon,
            { fontSize: 18, color: feedColors.textSecondary },
          ]}
        >
          💬
        </Text>
        <Text style={feedStyles.actionText}>
          {commentCount > 0 ? commentCount : "Comment"}
        </Text>
      </Pressable>
    </View>
  );
}
