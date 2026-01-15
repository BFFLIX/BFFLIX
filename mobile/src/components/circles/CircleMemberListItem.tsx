// mobile/src/components/circles/CircleMemberListItem.tsx

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActionSheetIOS, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { feedColors } from "../../styles/feedStyles";
import type { CircleMember } from "../../types/feed";

type CircleMemberListItemProps = {
  member: CircleMember;
  canManage: boolean;
  isCurrentUserOwner: boolean;
  onPromote?: (memberId: string) => void;
  onDemote?: (memberId: string) => void;
  onRemove?: (memberId: string) => void;
};

export function CircleMemberListItem({
  member,
  canManage,
  isCurrentUserOwner,
  onPromote,
  onDemote,
  onRemove,
}: CircleMemberListItemProps) {
  const router = useRouter();
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);

  const handleMemberPress = () => {
    // Navigate to user's public profile
    router.push(`/user/${member.id}` as any);
  };

  const getRoleBadge = () => {
    if (member.role === "owner" || member.isOwner) {
      return (
        <View style={[styles.roleBadge, styles.roleBadgeOwner]}>
          <Ionicons name="crown" size={12} color={feedColors.primary} />
          <Text style={[styles.roleText, styles.roleTextOwner]}>Owner</Text>
        </View>
      );
    }

    if (member.role === "moderator" || member.isModerator) {
      return (
        <View style={[styles.roleBadge, styles.roleBadgeMod]}>
          <Ionicons name="shield" size={12} color={feedColors.primary} />
          <Text style={[styles.roleText, styles.roleTextMod]}>Mod</Text>
        </View>
      );
    }

    return null;
  };

  const showActionSheet = () => {
    const isOwner = member.role === "owner" || member.isOwner;
    const isModerator = member.role === "moderator" || member.isModerator;

    // Owner cannot be managed
    if (isOwner) {
      return;
    }

    const options: string[] = [];
    const handlers: (() => void)[] = [];

    // Only owner can promote/demote moderators
    if (isCurrentUserOwner) {
      if (isModerator && onDemote) {
        options.push("Demote to Member");
        handlers.push(() => onDemote(member.id));
      } else if (!isModerator && onPromote) {
        options.push("Promote to Moderator");
        handlers.push(() => onPromote(member.id));
      }
    }

    // Both owner and moderators can remove members (but only owner can remove moderators)
    if (onRemove && (isCurrentUserOwner || !isModerator)) {
      options.push("Remove from Circle");
      handlers.push(() => {
        Alert.alert(
          "Remove Member",
          `Are you sure you want to remove ${member.username} from this circle?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => onRemove(member.id),
            },
          ]
        );
      });
    }

    options.push("Cancel");

    if (options.length === 1) {
      // Only "Cancel" option, nothing to show
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.findIndex((opt) => opt.includes("Remove")),
        },
        (buttonIndex) => {
          if (buttonIndex < handlers.length) {
            handlers[buttonIndex]();
          }
        }
      );
    } else {
      // For Android, show a simple alert with options
      Alert.alert(
        "Manage Member",
        `Select an action for ${member.username}`,
        [
          ...options.slice(0, -1).map((option, index) => ({
            text: option,
            onPress: handlers[index],
            style: option.includes("Remove") ? "destructive" as const : "default" as const,
          })),
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const isOwner = member.role === "owner" || member.isOwner;

  // Get initials from username for fallback avatar
  const getUserInitials = () => {
    if (!member.username) return "?";
    return member.username.charAt(0).toUpperCase();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={handleMemberPress}
      onLongPress={canManage && !isOwner ? showActionSheet : undefined}
    >
      <View style={styles.avatar}>
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{getUserInitials()}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {member.username || "Unknown"}
          </Text>
          {getRoleBadge()}
        </View>
      </View>

      {canManage && !isOwner && (
        <Ionicons name="ellipsis-horizontal" size={20} color={feedColors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  containerPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: feedColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    flex: 1,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  roleBadgeOwner: {
    backgroundColor: `${feedColors.primary}20`,
  },
  roleBadgeMod: {
    backgroundColor: `${feedColors.primary}15`,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  roleTextOwner: {
    color: feedColors.primary,
  },
  roleTextMod: {
    color: feedColors.primary,
  },
});
