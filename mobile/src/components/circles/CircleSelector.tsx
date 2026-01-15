// mobile/src/components/circles/CircleSelector.tsx

import React from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../styles/feedStyles";
import type { Circle } from "../../types/feed";

type CircleSelectorProps = {
  circles: Circle[];
  selectedCircleIds: string[];
  onToggleCircle: (circleId: string) => void;
  isLoading?: boolean;
  error?: string | null;
};

export function CircleSelector({
  circles,
  selectedCircleIds,
  onToggleCircle,
  isLoading = false,
  error = null,
}: CircleSelectorProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={feedColors.primary} />
        <Text style={styles.loadingText}>Loading your circles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (circles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={feedColors.textTertiary} />
        <Text style={styles.emptyTitle}>No Circles Yet</Text>
        <Text style={styles.emptyText}>
          You need to join or create a circle before you can post.
        </Text>
      </View>
    );
  }

  const renderCircleItem = ({ item }: { item: Circle }) => {
    const isSelected = selectedCircleIds.includes(item.id);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.circleItem,
          pressed && styles.circleItemPressed,
        ]}
        onPress={() => onToggleCircle(item.id)}
      >
        <View style={styles.circleInfo}>
          <View style={styles.checkbox}>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={feedColors.text} />
            )}
          </View>
          <View style={styles.circleDetails}>
            <Text style={styles.circleName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.circleDescription} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.visibilityBadge, item.visibility === "public" && styles.visibilityBadgePublic]}>
          <Ionicons
            name={item.visibility === "public" ? "globe-outline" : "lock-closed-outline"}
            size={12}
            color={item.visibility === "public" ? feedColors.primary : feedColors.textTertiary}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Post to Circles</Text>
        <Text style={styles.required}>*</Text>
        {selectedCircleIds.length > 0 && (
          <Text style={styles.counter}>
            {selectedCircleIds.length} selected
          </Text>
        )}
      </View>

      <FlatList
        data={circles}
        renderItem={renderCircleItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        scrollEnabled={false}
      />

      {selectedCircleIds.length === 0 && (
        <Text style={styles.validationError}>
          Please select at least one circle
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
  },
  required: {
    fontSize: 16,
    color: feedColors.error,
  },
  counter: {
    fontSize: 13,
    color: feedColors.primary,
    marginLeft: "auto",
  },
  list: {
    maxHeight: 200,
  },
  circleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: feedColors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  circleItemPressed: {
    opacity: 0.7,
  },
  circleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDetails: {
    flex: 1,
  },
  circleName: {
    fontSize: 15,
    fontWeight: "500",
    color: feedColors.text,
    marginBottom: 2,
  },
  circleDescription: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },
  visibilityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: feedColors.backgroundSecondary,
  },
  visibilityBadgePublic: {
    backgroundColor: `${feedColors.primary}15`,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: feedColors.textSecondary,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: `${feedColors.error}15`,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: feedColors.error,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: feedColors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedColors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  validationError: {
    fontSize: 13,
    color: feedColors.error,
    marginTop: 4,
  },
});
