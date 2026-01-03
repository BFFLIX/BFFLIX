// mobile/app/(app)/(drawer)/viewings/index.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  Text,
  RefreshControl,
  ScrollView,
} from "react-native";
import { viewingsStyles } from "../../../../src/styles/viewingsStyles";
import { feedColors } from "../../../../src/styles/feedStyles";
import { AppBar } from "../../../../src/components/feed/AppBar";
import { StatsCards } from "../../../../src/components/viewings/StatsCards";
import { FilterControls } from "../../../../src/components/viewings/FilterControls";
import { GenreCarousel } from "../../../../src/components/viewings/GenreCarousel";
import { ViewingDetailsSheet } from "../../../../src/components/viewings/ViewingDetailsSheet";
import { CreateViewingModal } from "../../../../src/components/viewings/CreateViewingModal";
import { CreateViewingFAB } from "../../../../src/components/viewings/CreateViewingFAB";
import { useViewings } from "../../../../src/hooks/useViewings";
import { groupViewingsByGenre } from "../../../../src/lib/viewings";
import type { Viewing, GenreGroup } from "../../../../src/types/viewings";

export default function ViewingsScreen() {
  const {
    viewings,
    stats,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    typeFilter,
    sortOrder,
    loadMore,
    refresh,
    deleteViewing,
    changeTypeFilter,
    changeSortOrder,
  } = useViewings();

  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [genreGroups, setGenreGroups] = useState<GenreGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);

  // Group viewings by genre whenever viewings change
  useEffect(() => {
    async function groupViewings() {
      if (viewings.length === 0) {
        setGenreGroups([]);
        return;
      }

      setIsGrouping(true);
      try {
        const groups = await groupViewingsByGenre(viewings);
        setGenreGroups(groups);
      } catch (err) {
        console.error("Failed to group viewings:", err);
      } finally {
        setIsGrouping(false);
      }
    }

    groupViewings();
  }, [viewings]);

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
  };

  const handleCreateSuccess = async () => {
    setCreateModalVisible(false);
    // Small delay to give backend time to process
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={viewingsStyles.container}>
        <AppBar />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text
            style={{
              color: feedColors.textSecondary,
              marginTop: 12,
              fontSize: 15,
            }}
          >
            Loading your viewings...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={viewingsStyles.container}>
        <AppBar />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text style={{ color: feedColors.textSecondary, fontSize: 16 }}>
            Failed to load viewings
          </Text>
          <Text
            style={{
              color: feedColors.textSecondary,
              fontSize: 14,
              marginTop: 8,
            }}
          >
            {error}
          </Text>
          <Pressable
            onPress={refresh}
            style={{
              marginTop: 16,
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: feedColors.primary,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (!viewings || viewings.length === 0) {
    return (
      <View style={viewingsStyles.container}>
        <AppBar />
        <StatsCards stats={stats} />
        <FilterControls
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          stats={stats}
          onTypeFilterChange={changeTypeFilter}
          onSortOrderChange={changeSortOrder}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text style={{ color: feedColors.textSecondary, fontSize: 16 }}>
            No viewings yet
          </Text>
          <Text
            style={{
              color: feedColors.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Track your first movie or show to get started!
          </Text>
        </View>

        <CreateViewingFAB onPress={() => setCreateModalVisible(true)} />

        <CreateViewingModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={handleCreateSuccess}
        />
      </View>
    );
  }

  // Main view with Netflix-style genre browsing
  return (
    <View style={viewingsStyles.container}>
      <AppBar />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={feedColors.primary}
          />
        }
        contentContainerStyle={viewingsStyles.contentContainer}
      >
        {/* Stats and Filters */}
        <StatsCards stats={stats} />
        <FilterControls
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          stats={stats}
          onTypeFilterChange={changeTypeFilter}
          onSortOrderChange={changeSortOrder}
        />

        {/* Genre Carousels */}
        {isGrouping ? (
          <View
            style={{
              padding: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color={feedColors.primary} />
            <Text
              style={{
                color: feedColors.textSecondary,
                marginTop: 8,
                fontSize: 13,
              }}
            >
              Organizing by genre...
            </Text>
          </View>
        ) : genreGroups.length > 0 ? (
          genreGroups.map((group) => (
            <GenreCarousel
              key={group.genreId}
              genreId={group.genreId}
              genreName={group.genreName}
              viewings={group.viewings}
              onViewingPress={handleOpenDetails}
            />
          ))
        ) : null}

        {/* Load More Button */}
        {hasMore && (
          <Pressable
            onPress={loadMore}
            style={viewingsStyles.loadMoreButton}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={feedColors.primary} />
            ) : (
              <Text style={viewingsStyles.loadMoreText}>Load more</Text>
            )}
          </Pressable>
        )}

        {/* End indicator */}
        {viewings.length > 0 && !hasMore && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: feedColors.textTertiary, fontSize: 13 }}>
              You've reached the end
            </Text>
          </View>
        )}
      </ScrollView>

      <CreateViewingFAB onPress={() => setCreateModalVisible(true)} />

      <CreateViewingModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      <ViewingDetailsSheet
        viewing={selectedViewing}
        visible={detailsVisible}
        onClose={handleCloseDetails}
        onDelete={handleDelete}
        isDeleting={deletingId === selectedViewing?.id}
      />
    </View>
  );
}
