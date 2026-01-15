// mobile/app/(app)/circles/[id]/moderate.tsx

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
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { feedColors } from "../../../../src/styles/feedStyles";
import { AppBar } from "../../../../src/components/feed/AppBar";
import { FeedPost } from "../../../../src/components/feed/FeedPost";
import {
  fetchCirclePosts,
  removePostFromCircle,
} from "../../../../src/lib/feed";
import type { FeedPost as FeedPostType } from "../../../../src/types/feed";

export default function CircleModerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [id])
  );

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetchCirclePosts(id, 1, 50);
      setPosts(response.items);
    } catch (err: any) {
      console.error("Failed to load posts:", err);
      Alert.alert("Error", err.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRemovePost = (postId: string, postTitle: string) => {
    Alert.alert(
      "Remove Post",
      `Remove "${postTitle}" from this circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removePostFromCircle(postId, id);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
              Alert.alert("Success", "Post removed from circle");
            } catch (err: any) {
              console.error("Failed to remove post:", err);
              Alert.alert("Error", err.message || "Failed to remove post");
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: FeedPostType }) => (
    <View style={styles.postContainer}>
      <FeedPost
        post={item}
        onLike={() => {}}
        onDelete={() => {}}
      />
      <Pressable
        style={styles.removeButton}
        onPress={() => handleRemovePost(item.id, item.title)}
      >
        <Text style={styles.removeButtonText}>Remove from Circle</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppBar />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadPosts();
            }}
            tintColor={feedColors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={styles.header}>
            Moderation • {posts.length} {posts.length === 1 ? "Post" : "Posts"}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts to moderate</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 16,
  },
  postContainer: {
    marginBottom: 16,
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: feedColors.error,
    borderRadius: 8,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: feedColors.textSecondary,
  },
});
