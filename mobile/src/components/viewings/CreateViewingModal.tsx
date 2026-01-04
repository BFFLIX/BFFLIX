// mobile/src/components/viewings/CreateViewingModal.tsx

import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { feedColors } from "../../styles/feedStyles";
import { MediaSearchInput } from "../feed/MediaSearchInput";
import { RatingStars } from "../feed/RatingStars";
import { useCreateViewing } from "../../hooks/useCreateViewing";

type CreateViewingModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateViewingModal({
  visible,
  onClose,
  onSuccess,
}: CreateViewingModalProps) {
  const {
    type,
    selectedMedia,
    rating,
    comment,
    watchedAt,
    seasonNumber,
    episodeNumber,
    errors,
    isSubmitting,
    handleTypeChange,
    handleSelectMedia,
    handleRatingChange,
    handleCommentChange,
    handleWatchedAtChange,
    handleSeasonChange,
    handleEpisodeChange,
    handleSubmit,
    resetForm,
  } = useCreateViewing(onSuccess);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Add Viewing</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Media Type Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => handleTypeChange("movie")}
                  style={[
                    styles.toggleButton,
                    type === "movie" && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      type === "movie" && styles.toggleButtonTextActive,
                    ]}
                  >
                    Movie
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleTypeChange("tv")}
                  style={[
                    styles.toggleButton,
                    type === "tv" && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      type === "tv" && styles.toggleButtonTextActive,
                    ]}
                  >
                    TV Show
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Media Search */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Search for {type === "movie" ? "Movie" : "TV Show"}
              </Text>
              <MediaSearchInput
                mediaType={type}
                onSelect={handleSelectMedia}
                selectedMedia={selectedMedia}
              />
              {errors.media && (
                <Text style={styles.errorText}>{errors.media}</Text>
              )}
            </View>

            {/* Watched Date */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Watched Date</Text>
              <TextInput
                style={styles.dateInput}
                value={watchedAt}
                onChangeText={handleWatchedAtChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={feedColors.textTertiary}
              />
            </View>

            {/* TV Show Fields */}
            {type === "tv" && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Episode (Optional)
                </Text>
                <View style={styles.episodeRow}>
                  <View style={styles.episodeInput}>
                    <Text style={styles.episodeLabel}>Season</Text>
                    <TextInput
                      style={styles.input}
                      value={seasonNumber}
                      onChangeText={handleSeasonChange}
                      placeholder="1"
                      placeholderTextColor={feedColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.episodeInput}>
                    <Text style={styles.episodeLabel}>Episode</Text>
                    <TextInput
                      style={styles.input}
                      value={episodeNumber}
                      onChangeText={handleEpisodeChange}
                      placeholder="1"
                      placeholderTextColor={feedColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                {errors.season && (
                  <Text style={styles.errorText}>{errors.season}</Text>
                )}
              </View>
            )}

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Rating (Optional)
              </Text>
              <RatingStars value={rating} onChange={handleRatingChange} />
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Notes (Optional)
              </Text>
              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={handleCommentChange}
                placeholder="What did you think? (max 1000 characters)"
                placeholderTextColor={feedColors.textTertiary}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{comment.length}/1000</Text>
              {errors.comment && (
                <Text style={styles.errorText}>{errors.comment}</Text>
              )}
            </View>

            {/* Validation Error */}
            {errors.ratingOrComment && (
              <View style={styles.section}>
                <Text style={styles.errorText}>{errors.ratingOrComment}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Saving..." : "Save Viewing"}
              </Text>
            </Pressable>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: feedColors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: feedColors.primary,
    borderColor: feedColors.primary,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: feedColors.textSecondary,
  },
  toggleButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  dateInput: {
    backgroundColor: feedColors.cardBackground,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
  },
  episodeRow: {
    flexDirection: "row",
    gap: 12,
  },
  episodeInput: {
    flex: 1,
  },
  episodeLabel: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: feedColors.cardBackground,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
  },
  textArea: {
    backgroundColor: feedColors.cardBackground,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: feedColors.textTertiary,
    textAlign: "right",
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: feedColors.error,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: feedColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
