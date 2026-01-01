// mobile/src/components/feed/CreatePostModal.tsx

import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { feedColors } from "../../styles/feedStyles";
import { MediaSearchInput } from "./MediaSearchInput";
import { RatingStars } from "./RatingStars";
import { CircleSelector } from "./CircleSelector";
import { useCreatePost } from "../../hooks/useCreatePost";

type CreatePostModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreatePostModal({
  visible,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const {
    mediaType,
    selectedMedia,
    rating,
    comment,
    selectedCircleIds,
    seasonNumber,
    episodeNumber,
    circles,
    loadingCircles,
    errors,
    isSubmitting,
    handleMediaTypeChange,
    handleSelectMedia,
    handleRatingChange,
    handleCommentChange,
    handleCircleChange,
    setSeasonNumber,
    setEpisodeNumber,
    handleSubmit,
    resetForm,
  } = useCreatePost(onSuccess);

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
            <Text style={styles.title}>Create Post</Text>
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
                  onPress={() => handleMediaTypeChange("movie")}
                  style={[
                    styles.toggleButton,
                    mediaType === "movie" && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      mediaType === "movie" && styles.toggleButtonTextActive,
                    ]}
                  >
                    Movie
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleMediaTypeChange("tv")}
                  style={[
                    styles.toggleButton,
                    mediaType === "tv" && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      mediaType === "tv" && styles.toggleButtonTextActive,
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
                Search {mediaType === "movie" ? "Movie" : "TV Show"} *
              </Text>
              <MediaSearchInput
                mediaType={mediaType}
                onSelect={handleSelectMedia}
                selectedId={selectedMedia?.id}
              />
              {errors.media && (
                <Text style={styles.errorText}>{errors.media}</Text>
              )}
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Rating (optional)</Text>
              <RatingStars
                value={rating}
                onChange={handleRatingChange}
                size={32}
              />
            </View>

            {/* Comment/Review */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Review (optional)</Text>
              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={handleCommentChange}
                placeholder="Share your thoughts..."
                placeholderTextColor={feedColors.textTertiary}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {comment.length} / 1000
              </Text>
            </View>

            {/* TV Show Specific Fields */}
            {mediaType === "tv" && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Episode Details (optional)</Text>
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <TextInput
                      style={styles.input}
                      value={seasonNumber}
                      onChangeText={setSeasonNumber}
                      placeholder="Season #"
                      placeholderTextColor={feedColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <TextInput
                      style={styles.input}
                      value={episodeNumber}
                      onChangeText={setEpisodeNumber}
                      placeholder="Episode #"
                      placeholderTextColor={feedColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Circle Selector */}
            <View style={styles.section}>
              {loadingCircles ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={feedColors.primary} />
                  <Text style={{ color: feedColors.textSecondary, marginTop: 8 }}>
                    Loading circles...
                  </Text>
                </View>
              ) : (
                <CircleSelector
                  circles={circles}
                  selectedCircleIds={selectedCircleIds}
                  onChange={handleCircleChange}
                  error={errors.circles}
                />
              )}
            </View>

            {/* Content Error */}
            {errors.content && (
              <View style={styles.section}>
                <Text style={styles.errorText}>{errors.content}</Text>
              </View>
            )}

            {/* Submit Button */}
            <View style={styles.section}>
              <Pressable
                onPress={handleSubmit}
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Post</Text>
                )}
              </Pressable>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },

  cancelButton: {
    fontSize: 16,
    color: feedColors.primary,
    fontWeight: "500",
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
    padding: 16,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 15,
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
    backgroundColor: feedColors.cardBackground,
    borderWidth: 2,
    borderColor: feedColors.border,
    alignItems: "center",
  },

  toggleButtonActive: {
    backgroundColor: feedColors.primary,
    borderColor: feedColors.primary,
  },

  toggleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.textSecondary,
  },

  toggleButtonTextActive: {
    color: "#fff",
  },

  textArea: {
    backgroundColor: feedColors.cardBackground,
    borderWidth: 1,
    borderColor: feedColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: feedColors.text,
    minHeight: 120,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 12,
    color: feedColors.textTertiary,
    marginTop: 4,
    textAlign: "right",
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

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfWidth: {
    flex: 1,
  },

  submitButton: {
    backgroundColor: feedColors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  submitButtonDisabled: {
    opacity: 0.5,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  errorText: {
    fontSize: 13,
    color: feedColors.error,
    marginTop: 4,
  },
});
