// mobile/app/(app)/circles/[id].tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../../src/styles/feedStyles";
import { AppBar } from "../../../src/components/feed/AppBar";
import { FeedPost } from "../../../src/components/feed/FeedPost";
import { useUser } from "../../../src/context/UserContext";
import {
  fetchCircleDetails,
  fetchCirclePosts,
  joinCircle,
  leaveCircle,
} from "../../../src/lib/feed";
import type { Circle, FeedPost as FeedPostType } from "../../../src/types/feed";

export default function CircleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCircleDetails();
      loadPosts(true);
    }, [id])
  );

  const loadCircleDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchCircleDetails(id);
      setCircle(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load circle:", err);
      setError(err.message || "Failed to load circle");
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (refresh = false) => {
    try {
      if (refresh) {
        setPostsLoading(true);
        setPage(1);
      }

      const currentPage = refresh ? 1 : page;
      const response = await fetchCirclePosts(id, currentPage, 20);

      if (refresh) {
        setPosts(response.items);
      } else {
        setPosts((prev) => [...prev, ...response.items]);
      }

      setHasMore(response.items.length === 20);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load posts:", err);
      setError(err.message || "Failed to load posts");
    } finally {
      setPostsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCircleDetails();
    loadPosts(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !postsLoading) {
      setPage((prev) => prev + 1);
      loadPosts(false);
    }
  };

  const handleJoin = async () => {
    if (joiningOrLeaving) return; // Prevent double-tap

    try {
      setJoiningOrLeaving(true);
      await joinCircle(id);
      await loadCircleDetails(); // Reload to get updated membership state
      Alert.alert("Success", "You've joined this circle!");
    } catch (err: any) {
      console.error("Failed to join:", err);
      Alert.alert("Error", err.message || "Failed to join circle");
    } finally {
      setJoiningOrLeaving(false);
    }
  };

  const handleLeave = () => {
    if (joiningOrLeaving) return; // Prevent action during another operation

    Alert.alert(
      "Leave Circle",
      `Are you sure you want to leave "${circle?.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setJoiningOrLeaving(true);
              await leaveCircle(id);
              router.back();
              Alert.alert("Success", "You've left the circle");
            } catch (err: any) {
              console.error("Failed to leave:", err);
              Alert.alert("Error", err.message || "Failed to leave circle");
              setJoiningOrLeaving(false);
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => {
    if (!circle) return null;

    // Use the isMember flag from backend (already computed server-side)
    const isMember = circle.isMember || circle.permissions?.isOwner || circle.permissions?.isModerator;
    const isPublic = circle.visibility === "public";

    return (
      <View style={styles.circleHeader}>
        <View style={styles.circleInfo}>
          <View style={styles.circleTitleRow}>
            <Text style={styles.circleName}>{circle.name}</Text>
            <View style={[styles.visibilityBadge, isPublic && styles.visibilityBadgePublic]}>
              <Ionicons
                name={isPublic ? "globe" : "lock-closed"}
                size={14}
                color={isPublic ? feedColors.primary : feedColors.textSecondary}
              />
              <Text style={[styles.visibilityText, isPublic && styles.visibilityTextPublic]}>
                {isPublic ? "Public" : "Private"}
              </Text>
            </View>
          </View>

          {circle.description && (
            <Text style={styles.circleDescription}>{circle.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people" size={16} color={feedColors.textTertiary} />
              <Text style={styles.statText}>{circle.membersCount} members</Text>
            </View>
            {circle.postCount !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="chatbubbles" size={16} color={feedColors.textTertiary} />
                <Text style={styles.statText}>{circle.postCount} posts</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isMember ? (
            <>
              <Pressable
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => router.push(`/circles/${id}/members` as any)}
              >
                <Ionicons name="people-outline" size={18} color={feedColors.text} />
                <Text style={styles.actionButtonTextSecondary}>Members</Text>
              </Pressable>

              {(circle.permissions?.isOwner || circle.permissions?.isModerator) && (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => router.push(`/circles/${id}/moderate` as any)}
                >
                  <Ionicons name="shield-outline" size={18} color={feedColors.text} />
                  <Text style={styles.actionButtonTextSecondary}>Moderate</Text>
                </Pressable>
              )}

              {circle.permissions?.isOwner && (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => router.push(`/circles/${id}/settings` as any)}
                >
                  <Ionicons name="settings-outline" size={18} color={feedColors.text} />
                  <Text style={styles.actionButtonTextSecondary}>Settings</Text>
                </Pressable>
              )}

              {!circle.permissions?.isOwner && (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={handleLeave}
                >
                  <Text style={styles.actionButtonTextDanger}>Leave</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Pressable
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                joiningOrLeaving && styles.actionButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={joiningOrLeaving}
            >
              {joiningOrLeaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionButtonTextPrimary}>Join Circle</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={styles.loadingText}>Loading circle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !circle) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppBar />

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <FeedPost
            post={item}
            currentUserId={user?.id}
            currentUserName={user?.username}
            onLike={() => {}}
            onDelete={() => {}}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={feedColors.primary}
          />
        }
        ListEmptyComponent={
          postsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={feedColors.primary} />
              <Text style={styles.loadingText}>Loading posts...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={feedColors.textTertiary} />
              <Text style={styles.emptyTitle}>No Posts Yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share something in this circle!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && posts.length > 0 ? (
            <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
              {postsLoading ? (
                <ActivityIndicator size="small" color={feedColors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  circleHeader: {
    padding: 16,
    backgroundColor: feedColors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
    marginBottom: 8,
  },
  circleInfo: {
    marginBottom: 16,
  },
  circleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  circleName: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    flex: 1,
    marginRight: 12,
  },
  visibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    backgroundColor: feedColors.background,
  },
  visibilityBadgePublic: {
    backgroundColor: `${feedColors.primary}15`,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedColors.textSecondary,
  },
  visibilityTextPublic: {
    color: feedColors.primary,
  },
  circleDescription: {
    fontSize: 14,
    color: feedColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: feedColors.textTertiary,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: feedColors.primary,
    flex: 1,
    justifyContent: "center",
  },
  actionButtonSecondary: {
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  actionButtonDanger: {
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.error,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtonTextSecondary: {
    color: feedColors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonTextDanger: {
    color: feedColors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: feedColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: feedColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: feedColors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  loadMoreButton: {
    padding: 16,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: 14,
    color: feedColors.primary,
    fontWeight: "600",
  },
});
