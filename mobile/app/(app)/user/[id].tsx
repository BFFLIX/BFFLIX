// mobile/app/(app)/user/[id].tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { feedColors } from "../../../src/styles/feedStyles";
import { AppBar } from "../../../src/components/feed/AppBar";
import { apiJson } from "../../../src/lib/api";

type PublicCircle = {
  id: string;
  name: string;
  description?: string;
  membersCount: number;
};

type RecentViewing = {
  id: string;
  title: string;
  mediaType: "movie" | "tv";
  watchedAt: string;
  rating?: number;
  posterPath?: string;
};

type ProfileStats = {
  totalViewings: number;
  movieCount: number;
  showCount: number;
};

type PublicUserProfile = {
  id: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  isPublicProfile: boolean;
  // Only present for public profiles
  circlesCount?: number;
  publicCircles?: PublicCircle[];
  services?: string[];
  recentViewings?: RecentViewing[];
  stats?: ProfileStats;
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [id])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiJson<PublicUserProfile>(`/auth/users/${id}/profile`);
      setProfile(data);
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!profile?.username) return "?";
    return profile.username.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <AppBar />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={feedColors.textTertiary} />
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>
            {error || "This user's profile could not be loaded"}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const getServiceIcon = (service: string) => {
    const icons: Record<string, string> = {
      netflix: "tv-outline",
      hulu: "play-circle-outline",
      max: "film-outline",
      prime: "bag-outline",
      disney: "star-outline",
      peacock: "leaf-outline",
    };
    return icons[service] || "play-outline";
  };

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      netflix: "Netflix",
      hulu: "Hulu",
      max: "Max",
      prime: "Prime Video",
      disney: "Disney+",
      peacock: "Peacock",
    };
    return labels[service] || service;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppBar />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{getUserInitials()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.username}>{profile.username}</Text>

          <Text style={styles.joinedDate}>
            Joined {new Date(profile.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Private Profile Notice */}
        {!profile.isPublicProfile && (
          <View style={styles.privateNotice}>
            <Ionicons name="lock-closed" size={20} color={feedColors.textSecondary} />
            <Text style={styles.privateText}>
              This profile is private.
            </Text>
          </View>
        )}

        {/* Public Profile Content */}
        {profile.isPublicProfile && (
          <>
            {/* Stats Row */}
            {(profile.circlesCount !== undefined || profile.stats) && (
              <View style={styles.statsContainer}>
                {profile.circlesCount !== undefined && (
                  <View style={styles.statCard}>
                    <Ionicons name="people" size={24} color={feedColors.primary} />
                    <Text style={styles.statNumber}>{profile.circlesCount}</Text>
                    <Text style={styles.statLabel}>
                      {profile.circlesCount === 1 ? "Circle" : "Circles"}
                    </Text>
                  </View>
                )}
                {profile.stats && (
                  <>
                    <View style={styles.statCard}>
                      <Ionicons name="eye" size={24} color={feedColors.primary} />
                      <Text style={styles.statNumber}>{profile.stats.totalViewings}</Text>
                      <Text style={styles.statLabel}>Viewings</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="film" size={24} color={feedColors.primary} />
                      <Text style={styles.statNumber}>{profile.stats.movieCount}</Text>
                      <Text style={styles.statLabel}>Movies</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="tv" size={24} color={feedColors.primary} />
                      <Text style={styles.statNumber}>{profile.stats.showCount}</Text>
                      <Text style={styles.statLabel}>Shows</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Streaming Services */}
            {profile.services && profile.services.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Streaming Services</Text>
                <View style={styles.servicesGrid}>
                  {profile.services.map((service) => (
                    <View key={service} style={styles.serviceChip}>
                      <Ionicons
                        name={getServiceIcon(service) as any}
                        size={16}
                        color={feedColors.primary}
                      />
                      <Text style={styles.serviceText}>{getServiceLabel(service)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Public Circles */}
            {profile.publicCircles && profile.publicCircles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Circles</Text>
                {profile.publicCircles.map((circle) => (
                  <Pressable
                    key={circle.id}
                    style={({ pressed }) => [
                      styles.circleCard,
                      pressed && styles.circleCardPressed,
                    ]}
                    onPress={() => router.push(`/circles/${circle.id}` as any)}
                  >
                    <View style={styles.circleInfo}>
                      <Text style={styles.circleName}>{circle.name}</Text>
                      {circle.description && (
                        <Text style={styles.circleDescription} numberOfLines={1}>
                          {circle.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.circleMeta}>
                      <Ionicons name="people-outline" size={14} color={feedColors.textTertiary} />
                      <Text style={styles.circleMembers}>{circle.membersCount}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Recent Viewings */}
            {profile.recentViewings && profile.recentViewings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Viewings</Text>
                {profile.recentViewings.map((viewing) => (
                  <View key={viewing.id} style={styles.viewingCard}>
                    {viewing.posterPath && (
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w92${viewing.posterPath}` }}
                        style={styles.viewingPoster}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.viewingInfo}>
                      <Text style={styles.viewingTitle} numberOfLines={1}>
                        {viewing.title}
                      </Text>
                      <View style={styles.viewingMeta}>
                        <Text style={styles.viewingType}>
                          {viewing.mediaType === "movie" ? "Movie" : "TV Show"}
                        </Text>
                        {viewing.rating && (
                          <View style={styles.viewingRating}>
                            <Ionicons name="star" size={12} color={feedColors.primary} />
                            <Text style={styles.viewingRatingText}>{viewing.rating}/10</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: feedColors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: feedColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: feedColors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    backgroundColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#ffffff",
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    color: feedColors.textSecondary,
  },
  privateNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 12,
  },
  privateText: {
    fontSize: 15,
    color: feedColors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    paddingHorizontal: 24,
    gap: 12,
    justifyContent: "center",
  },
  statCard: {
    alignItems: "center",
    padding: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 12,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: feedColors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: feedColors.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 13,
    color: feedColors.text,
    fontWeight: "500",
  },
  circleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
  },
  circleCardPressed: {
    opacity: 0.7,
  },
  circleInfo: {
    flex: 1,
    marginRight: 12,
  },
  circleName: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
  },
  circleDescription: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginTop: 2,
  },
  circleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  circleMembers: {
    fontSize: 13,
    color: feedColors.textTertiary,
  },
  viewingCard: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
  },
  viewingPoster: {
    width: 45,
    height: 68,
    borderRadius: 6,
    marginRight: 12,
  },
  viewingInfo: {
    flex: 1,
    justifyContent: "center",
  },
  viewingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 4,
  },
  viewingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewingType: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },
  viewingRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewingRatingText: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },
});
