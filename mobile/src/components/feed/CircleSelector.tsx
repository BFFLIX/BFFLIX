// mobile/src/components/feed/CircleSelector.tsx

import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { feedColors } from "../../styles/feedStyles";
import type { Circle } from "../../types/feed";

type CircleSelectorProps = {
  circles: Circle[];
  selectedCircleIds: string[];
  onChange: (circleIds: string[]) => void;
  error?: string;
};

export function CircleSelector({
  circles,
  selectedCircleIds,
  onChange,
  error,
}: CircleSelectorProps) {
  const handleToggle = (circleId: string) => {
    if (selectedCircleIds.includes(circleId)) {
      // Remove from selection
      onChange(selectedCircleIds.filter((id) => id !== circleId));
    } else {
      // Add to selection
      onChange([...selectedCircleIds, circleId]);
    }
  };

  if (circles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Select Circles *</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            You're not in any circles yet. Join a circle to create posts!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Select Circles * (at least 1 required)
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {circles.map((circle) => {
          const isSelected = selectedCircleIds.includes(circle.id);

          return (
            <Pressable
              key={circle.id}
              onPress={() => handleToggle(circle.id)}
              style={[styles.checkboxRow, isSelected && styles.checkboxRowSelected]}
            >
              {/* Checkbox */}
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>

              {/* Circle Name */}
              <Text style={styles.circleName}>{circle.name}</Text>

              {/* Member Count */}
              {circle.membersCount !== undefined && (
                <Text style={styles.memberCount}>
                  {circle.membersCount} {circle.membersCount === 1 ? "member" : "members"}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Selection Count */}
      <Text style={styles.selectionCount}>
        {selectedCircleIds.length} circle{selectedCircleIds.length !== 1 ? "s" : ""} selected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 8,
  },

  scrollView: {
    maxHeight: 200,
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
  },

  scrollContent: {
    padding: 8,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },

  checkboxRowSelected: {
    backgroundColor: feedColors.borderLight,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: feedColors.border,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxChecked: {
    backgroundColor: feedColors.primary,
    borderColor: feedColors.primary,
  },

  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  circleName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: feedColors.text,
  },

  memberCount: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },

  selectionCount: {
    fontSize: 12,
    color: feedColors.textSecondary,
    marginTop: 8,
  },

  errorText: {
    fontSize: 13,
    color: feedColors.error,
    marginTop: 4,
  },

  emptyState: {
    padding: 20,
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});
