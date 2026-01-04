// mobile/app/(app)/(drawer)/viewings/genre/[id].tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ViewingCard } from "../../../../../src/components/viewings/ViewingCard";
import { ViewingDetailsSheet } from "../../../../../src/components/viewings/ViewingDetailsSheet";
import { useViewings } from "../../../../../src/hooks/useViewings";
import { feedColors } from "../../../../../src/styles/feedStyles";
import type { Viewing } from "../../../../../src/types/viewings";

export default function GenreViewAllScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const genreId = parseInt(id || "0", 10);
  const genreName = name || "Genre";

  const { viewings, isLoading, deleteViewing } = useViewings();

  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter viewings by genre
  const genreViewings = viewings.filter((viewing) =>
    viewing.genres?.some((genre) => genre.id === genreId)
  );

  const handleOpenDetails = (viewing: Viewing) => {
    setSelectedViewing(viewing);
    setDetailsVisible(true);
  };

  const handleCloseDetails = () => {
    setDetailsVisible(false);
    setTimeout(() => setSelectedViewing(null), 300);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteViewing(id);
    setDeletingId(null);
    // Close details if we deleted the currently viewed item
    if (selectedViewing?.id === id) {
      handleCloseDetails();
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={feedColors.text} />
        </Pressable>
        <Text style={styles.title}>{genreName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Grid of viewings */}
      <FlatList
        data={genreViewings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ViewingCard
              viewing={item}
              onPress={handleOpenDetails}
              horizontal={false}
            />
          </View>
        )}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No viewings found in this genre
            </Text>
          </View>
        }
      />

      <ViewingDetailsSheet
        viewing={selectedViewing}
        visible={detailsVisible}
        onClose={handleCloseDetails}
        onDelete={handleDelete}
        isDeleting={deletingId === selectedViewing?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.text,
  },
  headerSpacer: {
    width: 32,
  },
  gridContent: {
    padding: 8,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
    gap: 8,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: "48%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: feedColors.textSecondary,
    textAlign: "center",
  },
});
