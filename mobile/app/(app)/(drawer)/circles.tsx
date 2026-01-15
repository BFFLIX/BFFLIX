// mobile/app/(app)/(drawer)/circles.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../../src/styles/feedStyles";
import { AppBar } from "../../../src/components/feed/AppBar";
import { CircleCard } from "../../../src/components/circles/CircleCard";
import { CreateCircleModal } from "../../../src/components/circles/CreateCircleModal";
import {
  fetchMyCircles,
  fetchDiscoverCircles,
  fetchCircleInvitations,
  joinCircle,
  acceptInvite,
  declineInvite,
} from "../../../src/lib/feed";
import type { Circle, CircleInvitation } from "../../../src/types/feed";

type Tab = "my" | "discover" | "invites";

export default function CirclesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // My Circles
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [myCirclesLoading, setMyCirclesLoading] = useState(true);
  const [myCirclesPage, setMyCirclesPage] = useState(1);
  const [myCirclesHasMore, setMyCirclesHasMore] = useState(true);

  // Discover
  const [discoverCircles, setDiscoverCircles] = useState<Circle[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Invites
  const [invitations, setInvitations] = useState<CircleInvitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "my") {
        loadMyCircles(true);
      } else if (activeTab === "discover") {
        loadDiscoverCircles(true);
      } else {
        loadInvitations();
      }
    }, [activeTab])
  );

  const loadMyCircles = async (refresh = false) => {
    try {
      if (refresh) {
        setMyCirclesLoading(true);
        setMyCirclesPage(1);
      }

      const page = refresh ? 1 : myCirclesPage;
      const response = await fetchMyCircles(page, 20);

      if (refresh) {
        setMyCircles(response.items);
      } else {
        setMyCircles((prev) => [...prev, ...response.items]);
      }

      setMyCirclesHasMore(response.items.length === 20);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load my circles:", err);
      setError(err.message || "Failed to load circles");
    } finally {
      setMyCirclesLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDiscoverCircles = async (refresh = false, query?: string) => {
    try {
      if (refresh) {
        setDiscoverLoading(true);
        setDiscoverPage(1);
      }

      const page = refresh ? 1 : discoverPage;
      const response = await fetchDiscoverCircles(page, 20, query);

      if (refresh) {
        setDiscoverCircles(response.items);
      } else {
        setDiscoverCircles((prev) => [...prev, ...response.items]);
      }

      setDiscoverHasMore(response.items.length === 20);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load discover circles:", err);
      setError(err.message || "Failed to load public circles");
    } finally {
      setDiscoverLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setInvitesLoading(true);
      const response = await fetchCircleInvitations();
      setInvitations(response.items || []);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load invitations:", err);
      setError(err.message || "Failed to load invitations");
    } finally {
      setInvitesLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === "my") {
      loadMyCircles(true);
    } else if (activeTab === "discover") {
      loadDiscoverCircles(true, searchQuery);
    } else {
      loadInvitations();
    }
  };

  const handleLoadMore = () => {
    if (activeTab === "my" && myCirclesHasMore && !myCirclesLoading) {
      setMyCirclesPage((prev) => prev + 1);
      loadMyCircles(false);
    } else if (activeTab === "discover" && discoverHasMore && !discoverLoading) {
      setDiscoverPage((prev) => prev + 1);
      loadDiscoverCircles(false, searchQuery);
    }
  };

  const handleJoinCircle = async (circleId: string) => {
    try {
      await joinCircle(circleId);
      // Refresh both lists
      loadMyCircles(true);
      loadDiscoverCircles(true, searchQuery);
    } catch (err: any) {
      console.error("Failed to join circle:", err);
      alert(err.message || "Failed to join circle");
    }
  };

  const handleAcceptInvite = async (circleId: string) => {
    try {
      await acceptInvite(circleId);
      loadInvitations();
      loadMyCircles(true);
    } catch (err: any) {
      console.error("Failed to accept invite:", err);
      alert(err.message || "Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (circleId: string) => {
    try {
      await declineInvite(circleId);
      loadInvitations();
    } catch (err: any) {
      console.error("Failed to decline invite:", err);
      alert(err.message || "Failed to decline invitation");
    }
  };

  const handleCircleCreated = () => {
    setIsCreateModalVisible(false);
    loadMyCircles(true);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce search
    setTimeout(() => {
      loadDiscoverCircles(true, text);
    }, 300);
  };

  const renderMyCirclesTab = () => {
    if (myCirclesLoading && myCircles.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={styles.loadingText}>Loading your circles...</Text>
        </View>
      );
    }

    if (error && myCircles.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={() => loadMyCircles(true)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (myCircles.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={feedColors.textTertiary} />
          <Text style={styles.emptyTitle}>No Circles Yet</Text>
          <Text style={styles.emptyText}>
            Join or create your first circle to start sharing with your community!
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={myCircles}
        renderItem={({ item }) => (
          <CircleCard
            circle={item}
            onPress={() => router.push(`/circles/${item.id}` as any)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={feedColors.primary}
          />
        }
        ListFooterComponent={
          myCirclesHasMore ? (
            <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
              {myCirclesLoading ? (
                <ActivityIndicator size="small" color={feedColors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
      />
    );
  };

  const renderDiscoverTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={feedColors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search public circles..."
            placeholderTextColor={feedColors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {discoverLoading && discoverCircles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={feedColors.primary} />
            <Text style={styles.loadingText}>Discovering circles...</Text>
          </View>
        ) : discoverCircles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={64} color={feedColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Public Circles Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? "Try a different search term" : "Be the first to create a public circle!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={discoverCircles}
            renderItem={({ item }) => (
              <CircleCard
                circle={item}
                onPress={() => router.push(`/circles/${item.id}` as any)}
                showJoinButton={!item.isMember}
                onJoin={() => handleJoinCircle(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={feedColors.primary}
              />
            }
            ListFooterComponent={
              discoverHasMore ? (
                <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
                  {discoverLoading ? (
                    <ActivityIndicator size="small" color={feedColors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </Pressable>
              ) : null
            }
          />
        )}
      </View>
    );
  };

  const renderInvitesTab = () => {
    if (invitesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      );
    }

    if (invitations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color={feedColors.textTertiary} />
          <Text style={styles.emptyTitle}>No Pending Invitations</Text>
          <Text style={styles.emptyText}>
            You'll see invitations here when someone invites you to join their circle
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={invitations}
        renderItem={({ item }) => {
          const circleName = typeof item.circleId === "string" ? item.circleName : item.circleId.name;
          const circleId = typeof item.circleId === "string" ? item.circleId : item.circleId.id;

          return (
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <Text style={styles.inviteCircleName}>{circleName}</Text>
                <Text style={styles.inviteDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.inviteFrom}>
                Invited by {item.inviterName || "Someone"}
              </Text>
              <View style={styles.inviteActions}>
                <Pressable
                  style={[styles.inviteButton, styles.acceptButton]}
                  onPress={() => handleAcceptInvite(circleId)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={[styles.inviteButton, styles.declineButton]}
                  onPress={() => handleDeclineInvite(circleId)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={feedColors.primary}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppBar />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "my" && styles.tabActive]}
          onPress={() => setActiveTab("my")}
        >
          <Text style={[styles.tabText, activeTab === "my" && styles.tabTextActive]}>
            My Circles
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "discover" && styles.tabActive]}
          onPress={() => setActiveTab("discover")}
        >
          <Text style={[styles.tabText, activeTab === "discover" && styles.tabTextActive]}>
            Discover
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "invites" && styles.tabActive]}
          onPress={() => setActiveTab("invites")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.tabText, activeTab === "invites" && styles.tabTextActive]}>
              Invites
            </Text>
            {invitations.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{invitations.length}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === "my" && renderMyCirclesTab()}
        {activeTab === "discover" && renderDiscoverTab()}
        {activeTab === "invites" && renderInvitesTab()}
      </View>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Create Circle Modal */}
      <CreateCircleModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSuccess={handleCircleCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: feedColors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: feedColors.textSecondary,
  },
  tabTextActive: {
    color: feedColors.primary,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 6,
    backgroundColor: feedColors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: feedColors.text,
    padding: 0,
  },
  listContent: {
    padding: 16,
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
  inviteCard: {
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  inviteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inviteCircleName: {
    fontSize: 17,
    fontWeight: "600",
    color: feedColors.text,
    flex: 1,
  },
  inviteDate: {
    fontSize: 12,
    color: feedColors.textTertiary,
  },
  inviteFrom: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 12,
  },
  inviteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: feedColors.primary,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  declineButton: {
    backgroundColor: feedColors.background,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  declineButtonText: {
    color: feedColors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: feedColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
