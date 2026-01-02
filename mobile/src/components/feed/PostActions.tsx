// mobile/src/components/feed/PostActions.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { feedStyles, feedColors } from "../../styles/feedStyles";

type PostActionsProps = {
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  commentsExpanded?: boolean;
  onLike: () => void;
  onComment: () => void;
};

export function PostActions({
  likeCount,
  commentCount,
  likedByMe,
  commentsExpanded,
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
          {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "Like" : "Likes"}` : "Like"}
        </Text>
      </Pressable>

      {/* Comment Button */}
      <Pressable
        onPress={onComment}
        style={[
          feedStyles.actionButton,
          commentsExpanded && feedStyles.actionButtonActive,
        ]}
      >
        <Text
          style={[
            feedStyles.actionIcon,
            { fontSize: 18, color: commentsExpanded ? feedColors.commentActive : feedColors.textSecondary },
          ]}
        >
          💬
        </Text>
        <Text
          style={[
            feedStyles.actionText,
            commentsExpanded && feedStyles.actionTextActive,
          ]}
        >
          {commentsExpanded
            ? "Hide Comments"
            : commentCount > 0
            ? `${commentCount} ${commentCount === 1 ? "Comment" : "Comments"}`
            : "Comment"}
        </Text>
      </Pressable>
    </View>
  );
}
