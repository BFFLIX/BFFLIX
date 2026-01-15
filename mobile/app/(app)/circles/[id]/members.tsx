// mobile/app/(app)/circles/[id]/members.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { feedColors } from "../../../../src/styles/feedStyles";
import { AppBar } from "../../../../src/components/feed/AppBar";
import { CircleMemberListItem } from "../../../../src/components/circles/CircleMemberListItem";
import {
  fetchCircleDetails,
  fetchCircleMembers,
  removeCircleMember,
  promoteToModerator,
  demoteModerator,
} from "../../../../src/lib/feed";
import type { Circle, CircleMember } from "../../../../src/types/feed";

export default function CircleMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [circleData, membersData] = await Promise.all([
        fetchCircleDetails(id),
        fetchCircleMembers(id, 1, 50),
      ]);
      setCircle(circleData);
      setMembers(membersData.items || []);
    } catch (err: any) {
      console.error("Failed to load members:", err);
      Alert.alert("Error", err.message || "Failed to load members");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePromote = async (memberId: string) => {
    try {
      await promoteToModerator(id, memberId);
      loadData();
      Alert.alert("Success", "Member promoted to moderator");
    } catch (err: any) {
      console.error("Failed to promote:", err);
      Alert.alert("Error", err.message || "Failed to promote member");
    }
  };

  const handleDemote = async (memberId: string) => {
    try {
      await demoteModerator(id, memberId);
      loadData();
      Alert.alert("Success", "Moderator demoted to member");
    } catch (err: any) {
      console.error("Failed to demote:", err);
      Alert.alert("Error", err.message || "Failed to demote moderator");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeCircleMember(id, memberId);
      loadData();
      Alert.alert("Success", "Member removed from circle");
    } catch (err: any) {
      console.error("Failed to remove:", err);
      Alert.alert("Error", err.message || "Failed to remove member");
    }
  };

  const isOwner = circle?.permissions?.isOwner || false;
  const canManage = isOwner || circle?.permissions?.isModerator || false;

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
        data={members}
        renderItem={({ item }) => (
          <CircleMemberListItem
            member={item}
            canManage={canManage}
            isCurrentUserOwner={isOwner}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onRemove={handleRemove}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadData();
            }}
            tintColor={feedColors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={styles.header}>
            {circle?.name} • {members.length} {members.length === 1 ? "Member" : "Members"}
          </Text>
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
});
