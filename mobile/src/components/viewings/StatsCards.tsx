// mobile/src/components/viewings/StatsCards.tsx

import React from "react";
import { View, Text } from "react-native";
import { viewingsStyles } from "../../styles/viewingsStyles";
import type { ViewingStats } from "../../types/viewings";

type StatsCardsProps = {
  stats: ViewingStats;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    {
      icon: "📺",
      label: "Total Viewings",
      value: stats.total,
      description: "all time",
    },
    {
      icon: "🎬",
      label: "Movies",
      value: stats.movies,
      description: "watched",
    },
    {
      icon: "📺",
      label: "TV Shows",
      value: stats.shows,
      description: "watched",
    },
    {
      icon: "📝",
      label: "With Notes",
      value: stats.notes,
      description: "commented",
    },
  ];

  return (
    <View style={viewingsStyles.statsContainer}>
      <View style={viewingsStyles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={viewingsStyles.statCard}>
            <Text style={viewingsStyles.statIcon}>{item.icon}</Text>
            <Text style={viewingsStyles.statLabel}>{item.label}</Text>
            <Text style={viewingsStyles.statValue}>{item.value}</Text>
            <Text style={viewingsStyles.statDescription}>{item.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
