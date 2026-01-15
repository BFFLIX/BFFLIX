// mobile/src/components/circles/CircleCard.tsx

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../styles/feedStyles";
import type { Circle } from "../../types/feed";

type CircleCardProps = {
  circle: Circle;
  onPress: () => void;
  showJoinButton?: boolean;
  onJoin?: () => void;
};

export function CircleCard({
  circle,
  onPress,
  showJoinButton = false,
  onJoin,
}: CircleCardProps) {
  const isPublic = circle.visibility === "public";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {circle.name}
          </Text>
          <View style={[styles.badge, isPublic ? styles.badgePublic : styles.badgePrivate]}>
            <Ionicons
              name={isPublic ? "globe-outline" : "lock-closed-outline"}
              size={12}
              color={isPublic ? feedColors.primary : feedColors.textSecondary}
            />
            <Text style={[styles.badgeText, isPublic ? styles.badgeTextPublic : styles.badgeTextPrivate]}>
              {isPublic ? "Public" : "Private"}
            </Text>
          </View>
        </View>

        {circle.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {circle.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.stats}>
          <Ionicons name="people-outline" size={14} color={feedColors.textTertiary} />
          <Text style={styles.statsText}>
            {circle.membersCount} {circle.membersCount === 1 ? "member" : "members"}
          </Text>
        </View>

        {showJoinButton && onJoin && !circle.isMember && (
          <Pressable
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.joinButtonPressed,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onJoin();
            }}
          >
            <Text style={styles.joinButtonText}>
              {isPublic ? "Join" : "Request"}
            </Text>
          </Pressable>
        )}

        {circle.isMember && (
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark-circle" size={16} color={feedColors.primary} />
            <Text style={styles.memberBadgeText}>Joined</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: feedColors.text,
    flex: 1,
    marginRight: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgePublic: {
    backgroundColor: `${feedColors.primary}15`,
  },
  badgePrivate: {
    backgroundColor: feedColors.background,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeTextPublic: {
    color: feedColors.primary,
  },
  badgeTextPrivate: {
    color: feedColors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: feedColors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statsText: {
    fontSize: 13,
    color: feedColors.textTertiary,
  },
  joinButton: {
    backgroundColor: feedColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonPressed: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: feedColors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 13,
    color: feedColors.primary,
    fontWeight: "600",
  },
});
