// mobile/src/components/feed/FeedHeader.tsx

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { feedColors } from "../../styles/feedStyles";
import type { FeedScope, FeedSort } from "../../types/feed";

type FeedHeaderProps = {
  activeTab: FeedScope;
  sortOrder: FeedSort;
  onTabChange: (tab: FeedScope) => void;
  onSortChange: (sort: FeedSort) => void;
};

export function FeedHeader({
  activeTab,
  sortOrder,
  onTabChange,
  onSortChange,
}: FeedHeaderProps) {
  const tabs: { key: FeedScope; label: string }[] = [
    { key: "all", label: "All" },
    { key: "circles", label: "Circles" },
    { key: "mine", label: "Mine" },
  ];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort Toggle */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        <Pressable
          onPress={() => onSortChange(sortOrder === "smart" ? "latest" : "smart")}
          style={styles.sortButton}
        >
          <Text style={styles.sortButtonText}>
            {sortOrder === "smart" ? "Top Picks" : "Newest"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: feedColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },

  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  tabActive: {
    borderBottomColor: feedColors.primary,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: feedColors.textSecondary,
  },

  tabTextActive: {
    color: feedColors.primary,
    fontWeight: "600",
  },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  sortLabel: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginRight: 8,
  },

  sortButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: feedColors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: feedColors.border,
  },

  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: feedColors.text,
  },
});
