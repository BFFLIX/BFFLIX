// mobile/src/components/viewings/GenreCarousel.tsx

import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ViewingCard } from "./ViewingCard";
import { feedColors } from "../../styles/feedStyles";
import type { Viewing } from "../../types/viewings";

type GenreCarouselProps = {
  genreId: number;
  genreName: string;
  viewings: Viewing[];
  onViewingPress: (viewing: Viewing) => void;
};

export function GenreCarousel({
  genreId,
  genreName,
  viewings,
  onViewingPress,
}: GenreCarouselProps) {
  const handleViewAll = () => {
    router.push({
      pathname: "/(app)/(drawer)/viewings/genre/[id]",
      params: { id: String(genreId), name: genreName },
    });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.genreTitle}>{genreName}</Text>
        <Pressable onPress={handleViewAll} hitSlop={8}>
          <Text style={styles.viewAllButton}>View All →</Text>
        </Pressable>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        data={viewings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ViewingCard
            viewing={item}
            onPress={onViewingPress}
            horizontal={true}
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  genreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.text,
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.primary,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
});
