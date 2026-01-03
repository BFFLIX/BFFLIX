// mobile/src/components/viewings/FilterControls.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { viewingsStyles } from "../../styles/viewingsStyles";
import type {
  ViewingFilterType,
  ViewingSortOrder,
  ViewingStats,
} from "../../types/viewings";

type FilterControlsProps = {
  typeFilter: ViewingFilterType;
  sortOrder: ViewingSortOrder;
  stats: ViewingStats;
  onTypeFilterChange: (type: ViewingFilterType) => void;
  onSortOrderChange: (sort: ViewingSortOrder) => void;
};

export function FilterControls({
  typeFilter,
  sortOrder,
  stats,
  onTypeFilterChange,
  onSortOrderChange,
}: FilterControlsProps) {
  const filters: { key: ViewingFilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "movie", label: "Movies", count: stats.movies },
    { key: "tv", label: "Shows", count: stats.shows },
  ];

  return (
    <View style={viewingsStyles.filterContainer}>
      {/* Type Filter Pills */}
      <View style={viewingsStyles.filterRow}>
        <View style={viewingsStyles.filterPills}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => onTypeFilterChange(filter.key)}
              style={[
                viewingsStyles.filterPill,
                typeFilter === filter.key && viewingsStyles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  viewingsStyles.filterPillText,
                  typeFilter === filter.key &&
                    viewingsStyles.filterPillTextActive,
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sort Controls */}
      <View style={viewingsStyles.sortRow}>
        <Text style={viewingsStyles.sortLabel}>Sort:</Text>
        <Pressable
          onPress={() =>
            onSortOrderChange(sortOrder === "newest" ? "oldest" : "newest")
          }
          style={viewingsStyles.sortButton}
        >
          <Text style={viewingsStyles.sortButtonText}>
            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
