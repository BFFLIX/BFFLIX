// mobile/src/components/viewings/ViewingCard.tsx

import React from "react";
import { View, Text, Pressable, Image, Dimensions } from "react-native";
import { viewingsStyles } from "../../styles/viewingsStyles";
import type { Viewing } from "../../types/viewings";

type ViewingCardProps = {
  viewing: Viewing;
  onPress: (viewing: Viewing) => void;
  horizontal?: boolean;
};

const { width } = Dimensions.get("window");
const cardWidth = width * 0.32; // ~1/3 screen width for horizontal carousel
const cardHeight = cardWidth * 1.5; // 2:3 aspect ratio for poster

export function ViewingCard({
  viewing,
  onPress,
  horizontal = false,
}: ViewingCardProps) {
  const displayTitle = viewing.title || "Unknown Title";
  const typeLabel = viewing.type === "movie" ? "Movie" : "TV";

  if (horizontal) {
    // Horizontal carousel card (Netflix-style)
    return (
      <Pressable
        onPress={() => onPress(viewing)}
        style={[
          viewingsStyles.horizontalCard,
          { width: cardWidth, marginRight: 8 },
        ]}
      >
        <View
          style={[
            viewingsStyles.horizontalPosterContainer,
            { height: cardHeight },
          ]}
        >
          {viewing.posterUrl ? (
            <Image
              source={{ uri: viewing.posterUrl }}
              style={viewingsStyles.horizontalPoster}
              resizeMode="cover"
            />
          ) : (
            <View style={viewingsStyles.horizontalPosterPlaceholder}>
              <Text style={{ fontSize: 32, opacity: 0.3 }}>🎬</Text>
            </View>
          )}

          {/* Bottom gradient overlay with type badge */}
          <View style={viewingsStyles.horizontalOverlay}>
            <View style={viewingsStyles.horizontalTypeBadge}>
              <Text style={viewingsStyles.horizontalTypeBadgeText}>
                {typeLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Title below poster */}
        <Text style={viewingsStyles.horizontalTitle} numberOfLines={2}>
          {displayTitle}
        </Text>
      </Pressable>
    );
  }

  // Vertical grid card (original layout, fixed)
  return (
    <Pressable
      onPress={() => onPress(viewing)}
      style={viewingsStyles.cardContainer}
    >
      {/* Poster with proper aspect ratio */}
      <View style={viewingsStyles.posterContainer}>
        {viewing.posterUrl ? (
          <Image
            source={{ uri: viewing.posterUrl }}
            style={viewingsStyles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={viewingsStyles.posterPlaceholder}>
            <Text style={{ fontSize: 48, opacity: 0.3 }}>🎬</Text>
          </View>
        )}
      </View>

      {/* Content below poster */}
      <View style={viewingsStyles.cardContent}>
        {/* Type badge and date in same row */}
        <View style={viewingsStyles.metaRow}>
          <View style={viewingsStyles.typeBadge}>
            <Text style={viewingsStyles.typeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={viewingsStyles.watchedDate}>
            {viewing.year || ""}
          </Text>
        </View>

        {/* Title */}
        <Text style={viewingsStyles.cardTitle} numberOfLines={2}>
          {displayTitle}
        </Text>
      </View>
    </Pressable>
  );
}
