// mobile/src/components/viewings/ViewingDetailsSheet.tsx

import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { viewingsStyles } from "../../styles/viewingsStyles";
import { feedColors } from "../../styles/feedStyles";
import { RatingStars } from "../feed/RatingStars";
import type { Viewing } from "../../types/viewings";

type ViewingDetailsSheetProps = {
  viewing: Viewing | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export function ViewingDetailsSheet({
  viewing,
  visible,
  onClose,
  onDelete,
  isDeleting = false,
}: ViewingDetailsSheetProps) {
  if (!viewing) return null;

  // Format watched date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const displayTitle = viewing.title || "Unknown Title";
  const watchedDate = formatDate(viewing.watchedAt);
  const typeLabel = viewing.type === "movie" ? "Movie" : "TV Show";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={viewingsStyles.bottomSheet}>
        {/* Handle */}
        <View style={viewingsStyles.bottomSheetHandle} />

        {/* Content */}
        <ScrollView style={viewingsStyles.bottomSheetContent}>
          {/* Poster */}
          {viewing.posterUrl ? (
            <Image
              source={{ uri: viewing.posterUrl }}
              style={viewingsStyles.bottomSheetPoster}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                viewingsStyles.bottomSheetPoster,
                { justifyContent: "center", alignItems: "center" },
              ]}
            >
              <Text style={{ fontSize: 80, opacity: 0.3 }}>🎬</Text>
            </View>
          )}

          {/* Title */}
          <Text style={viewingsStyles.bottomSheetTitle}>{displayTitle}</Text>

          {/* Meta info */}
          <View style={viewingsStyles.bottomSheetMeta}>
            <Text style={viewingsStyles.bottomSheetMetaText}>{typeLabel}</Text>
            {viewing.year && (
              <Text style={viewingsStyles.bottomSheetMetaText}>
                • {viewing.year}
              </Text>
            )}
            {viewing.type === "tv" &&
              viewing.seasonNumber !== undefined &&
              viewing.episodeNumber !== undefined && (
                <Text style={viewingsStyles.bottomSheetMetaText}>
                  • S{viewing.seasonNumber} E{viewing.episodeNumber}
                </Text>
              )}
          </View>

          {/* Watched date */}
          <Text
            style={[
              viewingsStyles.bottomSheetMetaText,
              { marginBottom: 16 },
            ]}
          >
            Watched on {watchedDate}
          </Text>

          {/* Rating */}
          {viewing.rating && viewing.rating > 0 && (
            <View style={viewingsStyles.bottomSheetRating}>
              <RatingStars value={viewing.rating} readonly />
            </View>
          )}

          {/* Comment */}
          {viewing.comment && (
            <>
              <Text
                style={[
                  viewingsStyles.bottomSheetMetaText,
                  { marginBottom: 8, fontWeight: "600" },
                ]}
              >
                Your Notes:
              </Text>
              <Text style={viewingsStyles.bottomSheetComment}>
                {viewing.comment}
              </Text>
            </>
          )}

          {/* Delete Button */}
          <Pressable
            onPress={() => {
              onDelete(viewing.id);
              onClose();
            }}
            style={[
              viewingsStyles.bottomSheetButton,
              viewingsStyles.bottomSheetDeleteButton,
            ]}
            disabled={isDeleting}
          >
            <Text style={viewingsStyles.bottomSheetButtonText}>
              {isDeleting ? "Deleting..." : "Delete Viewing"}
            </Text>
          </Pressable>

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={[
              viewingsStyles.bottomSheetButton,
              { backgroundColor: feedColors.borderLight },
            ]}
          >
            <Text
              style={[
                viewingsStyles.bottomSheetButtonText,
                { color: feedColors.text },
              ]}
            >
              Close
            </Text>
          </Pressable>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
