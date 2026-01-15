// mobile/app/(app)/(tabs)/index.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { feedStyles, feedColors } from "../../../src/styles/feedStyles";
import { AppBar } from "../../../src/components/feed/AppBar";
import { FeedHeader } from "../../../src/components/feed/FeedHeader";
import { FeedPost } from "../../../src/components/feed/FeedPost";
import { CreatePostFAB } from "../../../src/components/feed/CreatePostFAB";
import { CreatePostModal } from "../../../src/components/feed/CreatePostModal";
import { useFeed } from "../../../src/hooks/useFeed";
import { useAuth } from "../../../src/auth/AuthContext";
import { useUser } from "../../../src/context/UserContext";

export default function HomeScreen() {
  const { isAuthed, isReady } = useAuth();
  const { user } = useUser();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const {
    posts,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    scope,
    sort,
    loadMore,
    refresh,
    handleLike,
    handleDelete,
    changeScope,
    changeSort,
  } = useFeed();

  // Refresh feed when screen comes into focus (after profile updates)
  useFocusEffect(
    useCallback(() => {
      if (isAuthed && isReady) {
        console.log('[HOME] Screen focused - refreshing feed');
        refresh();
      }
    }, [isAuthed, isReady, refresh])
  );

  // CRITICAL: Don't render anything until BOTH ready AND authenticated
  // This prevents API calls before user is logged in
  if (!isReady) {
    console.log('[HOME] Not ready yet, returning null');
    return null;
  }

  if (!isAuthed) {
    console.log('[HOME] Not authenticated, returning null');
    return null;
  }

  console.log('[HOME] Rendering home screen - user is authenticated');

  // Handle post creation success
  const handlePostCreated = async () => {
    setIsCreateModalVisible(false);
    // Small delay to give backend time to process the post
    await new Promise(resolve => setTimeout(resolve, 500));
    await refresh(); // Refresh feed to show new post
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={feedStyles.container}>
        <AppBar />
        <View style={feedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={feedStyles.emptyText}>Loading your feed...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={feedStyles.container}>
        <AppBar />
        <View style={feedStyles.emptyContainer}>
          <Text style={feedStyles.emptyText}>Failed to load feed</Text>
          <Text style={[feedStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => refresh()}
            style={[feedStyles.button, feedStyles.buttonPrimary, { marginTop: 16 }]}
          >
            <Text style={feedStyles.buttonTextPrimary}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <View style={feedStyles.container}>
        <AppBar />
        <FeedHeader
          activeTab={scope}
          sortOrder={sort}
          onTabChange={changeScope}
          onSortChange={changeSort}
        />
        <View style={feedStyles.emptyContainer}>
          <Text style={feedStyles.emptyText}>No posts yet</Text>
          <Text style={[feedStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
            Make your first post or join a circle to start your feed!
          </Text>
        </View>

        {/* Floating Action Button */}
        <CreatePostFAB onPress={() => setIsCreateModalVisible(true)} />

        {/* Create Post Modal */}
        <CreatePostModal
          visible={isCreateModalVisible}
          onClose={() => setIsCreateModalVisible(false)}
          onSuccess={handlePostCreated}
        />
      </View>
    );
  }

  return (
    <View style={feedStyles.container}>
      <AppBar />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPost
            post={item}
            currentUserId={user?.id}
            currentUserName={user?.username}
            onLike={handleLike}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={
          <FeedHeader
            activeTab={scope}
            sortOrder={sort}
            onTabChange={changeScope}
            onSortChange={changeSort}
          />
        }
        contentContainerStyle={feedStyles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={feedColors.primary}
          />
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              onPress={loadMore}
              style={feedStyles.loadMoreButton}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={feedColors.primary} />
              ) : (
                <Text style={feedStyles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : posts.length > 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: feedColors.textTertiary, fontSize: 13 }}>
                You've reached the end
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating Action Button */}
      <CreatePostFAB onPress={() => setIsCreateModalVisible(true)} />

      {/* Create Post Modal */}
      <CreatePostModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSuccess={handlePostCreated}
      />
    </View>
  );
}
