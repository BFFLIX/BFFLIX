// mobile/app/(app)/(drawer)/settings.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { feedColors } from "../../../src/styles/feedStyles";
import { AuthInput } from "../../../src/components/auth/AuthInput";
import { apiJson } from "../../../src/lib/api";
import { clearTokens } from "../../../src/lib/tokenStore";
import { Ionicons } from "@expo/vector-icons";

type ProfileVisibility = "public" | "friends" | "private";

type UserSettings = {
  profileVisibility: ProfileVisibility;
  showCircles: boolean;
  showViewingHistory: boolean;
  showStats: boolean;
  // Notification settings
  notificationsEnabled: boolean;
  notifyOnNewFollower: boolean;
  notifyOnCircleInvite: boolean;
  notifyOnPostLike: boolean;
  notifyOnComment: boolean;
};

type BlockedUser = {
  id: string;
  username: string;
  avatarUrl?: string;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Change password state
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Privacy settings state
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    profileVisibility: "public",
    showCircles: true,
    showViewingHistory: true,
    showStats: true,
    notificationsEnabled: true,
    notifyOnNewFollower: true,
    notifyOnCircleInvite: true,
    notifyOnPostLike: true,
    notifyOnComment: true,
  });
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);

  // Blocked users state
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  // Load user settings on focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const user = await apiJson<any>("/me");
      setSettings({
        profileVisibility: user.profileVisibility || "public",
        showCircles: user.showCircles !== false,
        showViewingHistory: user.showViewingHistory !== false,
        showStats: user.showStats !== false,
        notificationsEnabled: user.notificationsEnabled !== false,
        notifyOnNewFollower: user.notifyOnNewFollower !== false,
        notifyOnCircleInvite: user.notifyOnCircleInvite !== false,
        notifyOnPostLike: user.notifyOnPostLike !== false,
        notifyOnComment: user.notifyOnComment !== false,
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      setLoadingBlockedUsers(true);
      const data = await apiJson<{ blockedUsers: BlockedUser[] }>("/me/blocked");
      setBlockedUsers(data.blockedUsers || []);
    } catch (err) {
      console.error("Failed to load blocked users:", err);
      Alert.alert("Error", "Failed to load blocked users");
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      setUnblockingUserId(userId);
      await apiJson(`/me/blocked/${userId}`, { method: "DELETE" });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
      Alert.alert("Error", "Failed to unblock user");
    } finally {
      setUnblockingUserId(null);
    }
  };

  const openBlockedUsersModal = () => {
    setBlockedUsersModalVisible(true);
    loadBlockedUsers();
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setSavingSettings(true);
      await apiJson("/me", {
        method: "PATCH",
        body: JSON.stringify(newSettings),
      });
      setSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    setVisibilityModalVisible(false);
    saveSettings({ profileVisibility: visibility });
  };

  const getVisibilityLabel = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case "public":
        return "Public";
      case "friends":
        return "Friends Only";
      case "private":
        return "Private";
    }
  };

  const getVisibilityDescription = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case "public":
        return "Anyone can see your full profile";
      case "friends":
        return "Only friends can see your full profile";
      case "private":
        return "Only you can see your full profile";
    }
  };

  async function handleDeleteAccount() {
    setPasswordError("");

    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    Alert.alert(
      "Permanently Delete Account?",
      "This action cannot be undone. All your data will be anonymized and you will be logged out immediately.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              await apiJson("/me", {
                method: "DELETE",
                body: JSON.stringify({ password: password.trim() }),
              });

              // Clear tokens and navigate to auth
              await clearTokens();
              setDeleteModalVisible(false);
              setPassword("");

              // Navigate to auth screen
              router.replace("/(auth)/login");

              // Show success message after navigation
              setTimeout(() => {
                Alert.alert(
                  "Account Deleted",
                  "Your account has been permanently deleted."
                );
              }, 500);
            } catch (err: any) {
              console.error("[SETTINGS] Delete account failed:", err);

              if (err?.message?.toLowerCase().includes("password")) {
                setPasswordError("Incorrect password");
              } else if (err?.message?.toLowerCase().includes("already_deleted")) {
                setPasswordError("Account already deleted");
              } else {
                Alert.alert(
                  "Error",
                  err?.message || "Failed to delete account. Please try again."
                );
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  function openDeleteModal() {
    setPassword("");
    setPasswordError("");
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    if (deleting) return; // Prevent closing while deleting
    setPassword("");
    setPasswordError("");
    setDeleteModalVisible(false);
  }

  // Change password functions
  function openChangePasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    setChangePasswordModalVisible(true);
  }

  function closeChangePasswordModal() {
    if (changingPassword) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    setChangePasswordModalVisible(false);
  }

  async function handleChangePassword() {
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");

    let hasError = false;

    if (!currentPassword.trim()) {
      setCurrentPasswordError("Current password is required");
      hasError = true;
    }

    if (!newPassword.trim()) {
      setNewPasswordError("New password is required");
      hasError = true;
    } else if (newPassword.length < 8) {
      setNewPasswordError("Password must be at least 8 characters");
      hasError = true;
    } else if (!/[A-Z]/.test(newPassword)) {
      setNewPasswordError("Password must include an uppercase letter");
      hasError = true;
    } else if (!/[0-9]/.test(newPassword)) {
      setNewPasswordError("Password must include a number");
      hasError = true;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Please confirm your new password");
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasError = true;
    }

    if (hasError) return;

    try {
      setChangingPassword(true);
      await apiJson("/me/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      closeChangePasswordModal();
      Alert.alert("Success", "Your password has been changed successfully.");
    } catch (err: any) {
      console.error("[SETTINGS] Change password failed:", err);

      if (err?.message?.toLowerCase().includes("current") || err?.message?.toLowerCase().includes("invalid")) {
        setCurrentPasswordError("Incorrect current password");
      } else if (err?.message?.toLowerCase().includes("reuse")) {
        setNewPasswordError("Cannot reuse your current password");
      } else {
        Alert.alert("Error", err?.message || "Failed to change password. Please try again.");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header with Safe Area */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* Hamburger Menu */}
          <Pressable
            onPress={() => (navigation as any).openDrawer?.()}
            style={styles.hamburgerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color={feedColors.text} />
          </Pressable>

          {/* Title */}
          <Text style={styles.headerTitle}>Settings</Text>

          {/* Right spacer for balance */}
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          {loadingSettings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={feedColors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={feedColors.primary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Push Notifications</Text>
                    <Text style={styles.settingSubtext}>
                      Enable all notifications
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(value) => saveSettings({ notificationsEnabled: value })}
                  trackColor={{ false: feedColors.border, true: feedColors.primary }}
                  thumbColor="#ffffff"
                  disabled={savingSettings}
                />
              </View>

              {settings.notificationsEnabled && (
                <>
                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="person-add-outline"
                        size={22}
                        color={feedColors.textSecondary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>New Followers</Text>
                        <Text style={styles.settingSubtext}>
                          When someone follows you
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.notifyOnNewFollower}
                      onValueChange={(value) => saveSettings({ notifyOnNewFollower: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="people-outline"
                        size={22}
                        color={feedColors.textSecondary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Circle Invites</Text>
                        <Text style={styles.settingSubtext}>
                          When you're invited to a circle
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.notifyOnCircleInvite}
                      onValueChange={(value) => saveSettings({ notifyOnCircleInvite: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="heart-outline"
                        size={22}
                        color={feedColors.textSecondary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Post Likes</Text>
                        <Text style={styles.settingSubtext}>
                          When someone likes your post
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.notifyOnPostLike}
                      onValueChange={(value) => saveSettings({ notifyOnPostLike: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={22}
                        color={feedColors.textSecondary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Comments</Text>
                        <Text style={styles.settingSubtext}>
                          When someone comments on your post
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.notifyOnComment}
                      onValueChange={(value) => saveSettings({ notifyOnComment: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={openChangePasswordModal}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="key-outline"
                size={22}
                color={feedColors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingSubtext}>Update your password</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={feedColors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={openBlockedUsersModal}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="ban-outline"
                size={22}
                color={feedColors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Blocked Users</Text>
                <Text style={styles.settingSubtext}>Manage blocked accounts</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={feedColors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          {loadingSettings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={feedColors.primary} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setVisibilityModalVisible(true)}
                activeOpacity={0.7}
                disabled={savingSettings}
              >
                <View style={styles.settingInfo}>
                  <Ionicons
                    name="eye-outline"
                    size={22}
                    color={feedColors.primary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Profile Visibility</Text>
                    <Text style={styles.settingSubtext}>
                      {getVisibilityLabel(settings.profileVisibility)}
                    </Text>
                  </View>
                </View>
                {savingSettings ? (
                  <ActivityIndicator size="small" color={feedColors.primary} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={feedColors.textTertiary}
                  />
                )}
              </TouchableOpacity>

              {settings.profileVisibility === "public" && (
                <>
                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="people-outline"
                        size={22}
                        color={feedColors.primary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Show Circles</Text>
                        <Text style={styles.settingSubtext}>
                          Display your circles on your profile
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.showCircles}
                      onValueChange={(value) => saveSettings({ showCircles: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="film-outline"
                        size={22}
                        color={feedColors.primary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Show Viewing History</Text>
                        <Text style={styles.settingSubtext}>
                          Display recent viewings on your profile
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.showViewingHistory}
                      onValueChange={(value) => saveSettings({ showViewingHistory: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="stats-chart-outline"
                        size={22}
                        color={feedColors.primary}
                        style={styles.settingIcon}
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Show Stats</Text>
                        <Text style={styles.settingSubtext}>
                          Display viewing stats on your profile
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={settings.showStats}
                      onValueChange={(value) => saveSettings({ showStats: value })}
                      trackColor={{ false: feedColors.border, true: feedColors.primary }}
                      thumbColor="#ffffff"
                      disabled={savingSettings}
                    />
                  </View>
                </>
              )}

              {settings.profileVisibility !== "public" && (
                <View style={styles.privacyNote}>
                  <Ionicons name="information-circle" size={18} color={feedColors.textSecondary} />
                  <Text style={styles.privacyNoteText}>
                    Set your profile to Public to customize what others can see.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert("BFFlix", "Version 1.0.0")}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={feedColors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>App Version</Text>
                <Text style={styles.settingSubtext}>1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(auth)/terms")}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={feedColors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Text style={styles.settingSubtext}>View our terms</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={feedColors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(auth)/privacy")}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={feedColors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingSubtext}>View our privacy policy</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={feedColors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Ionicons name="warning" size={20} color={feedColors.error} />
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>

          <Text style={styles.dangerWarning}>
            These actions are permanent and cannot be undone.
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={openDeleteModal}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#ffffff"
              style={styles.deleteButtonIcon}
            />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={styles.dangerExplanation}>
            Deleting your account will permanently remove all your data,
            including your profile, posts, comments, and viewing history. This
            action cannot be reversed.
          </Text>
        </View>
      </ScrollView>

      {/* Profile Visibility Modal */}
      <Modal
        visible={visibilityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisibilityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisibilityModalVisible(false)}
        >
          <View style={styles.visibilityModalContent}>
            <Text style={styles.visibilityModalTitle}>Profile Visibility</Text>
            <Text style={styles.visibilityModalSubtitle}>
              Choose who can see your full profile
            </Text>

            {(["public", "friends", "private"] as ProfileVisibility[]).map((visibility) => (
              <TouchableOpacity
                key={visibility}
                style={[
                  styles.visibilityOption,
                  settings.profileVisibility === visibility && styles.visibilityOptionSelected,
                ]}
                onPress={() => handleVisibilityChange(visibility)}
                activeOpacity={0.7}
              >
                <View style={styles.visibilityOptionContent}>
                  <Ionicons
                    name={
                      visibility === "public"
                        ? "globe-outline"
                        : visibility === "friends"
                        ? "people-outline"
                        : "lock-closed-outline"
                    }
                    size={24}
                    color={
                      settings.profileVisibility === visibility
                        ? feedColors.primary
                        : feedColors.text
                    }
                    style={styles.visibilityOptionIcon}
                  />
                  <View style={styles.visibilityOptionText}>
                    <Text
                      style={[
                        styles.visibilityOptionLabel,
                        settings.profileVisibility === visibility && styles.visibilityOptionLabelSelected,
                      ]}
                    >
                      {getVisibilityLabel(visibility)}
                    </Text>
                    <Text style={styles.visibilityOptionDescription}>
                      {getVisibilityDescription(visibility)}
                    </Text>
                  </View>
                </View>
                {settings.profileVisibility === visibility && (
                  <Ionicons name="checkmark-circle" size={24} color={feedColors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.visibilityCloseButton}
              onPress={() => setVisibilityModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.visibilityCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeChangePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="key" size={32} color={feedColors.primary} />
              <Text style={styles.modalTitle}>Change Password</Text>
            </View>

            <Text style={styles.modalMessage}>
              Enter your current password and choose a new one.
            </Text>

            <AuthInput
              label="Current Password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setCurrentPasswordError("");
              }}
              placeholder="Enter current password"
              secureTextEntry
              autoCapitalize="none"
              error={currentPasswordError}
              editable={!changingPassword}
            />

            <AuthInput
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setNewPasswordError("");
              }}
              placeholder="Enter new password"
              secureTextEntry
              autoCapitalize="none"
              error={newPasswordError}
              editable={!changingPassword}
            />

            <AuthInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError("");
              }}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
              error={confirmPasswordError}
              editable={!changingPassword}
            />

            <View style={styles.passwordRequirements}>
              <Text style={styles.passwordRequirementsTitle}>Password requirements:</Text>
              <Text style={styles.passwordRequirement}>• At least 8 characters</Text>
              <Text style={styles.passwordRequirement}>• At least one uppercase letter</Text>
              <Text style={styles.passwordRequirement}>• At least one number</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeChangePasswordModal}
                disabled={changingPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.changePasswordButton,
                  changingPassword && styles.changePasswordButtonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword}
                activeOpacity={0.7}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.changePasswordButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={blockedUsersModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockedUsersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockedUsersModalContent}>
            <View style={styles.blockedUsersHeader}>
              <Text style={styles.blockedUsersTitle}>Blocked Users</Text>
              <TouchableOpacity
                onPress={() => setBlockedUsersModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={feedColors.text} />
              </TouchableOpacity>
            </View>

            {loadingBlockedUsers ? (
              <View style={styles.blockedUsersLoading}>
                <ActivityIndicator size="large" color={feedColors.primary} />
                <Text style={styles.blockedUsersLoadingText}>Loading...</Text>
              </View>
            ) : blockedUsers.length === 0 ? (
              <View style={styles.blockedUsersEmpty}>
                <Ionicons name="checkmark-circle-outline" size={48} color={feedColors.textTertiary} />
                <Text style={styles.blockedUsersEmptyText}>No blocked users</Text>
                <Text style={styles.blockedUsersEmptySubtext}>
                  Users you block won't be able to see your profile or interact with you
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.blockedUsersList}>
                {blockedUsers.map((user) => (
                  <View key={user.id} style={styles.blockedUserRow}>
                    <View style={styles.blockedUserInfo}>
                      {user.avatarUrl ? (
                        <View style={styles.blockedUserAvatar}>
                          <View style={[styles.blockedUserAvatarImage, { backgroundColor: feedColors.backgroundSecondary }]}>
                            <Text style={styles.blockedUserAvatarText}>
                              {user.username.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.blockedUserAvatar}>
                          <View style={styles.blockedUserAvatarFallback}>
                            <Text style={styles.blockedUserAvatarText}>
                              {user.username.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      )}
                      <Text style={styles.blockedUserName}>{user.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.unblockButton,
                        unblockingUserId === user.id && styles.unblockButtonDisabled,
                      ]}
                      onPress={() => handleUnblockUser(user.id)}
                      disabled={unblockingUserId === user.id}
                      activeOpacity={0.7}
                    >
                      {unblockingUserId === user.id ? (
                        <ActivityIndicator size="small" color={feedColors.primary} />
                      ) : (
                        <Text style={styles.unblockButtonText}>Unblock</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={feedColors.error} />
              <Text style={styles.modalTitle}>Delete Account</Text>
            </View>

            <Text style={styles.modalMessage}>
              This action is permanent and cannot be undone. All your data will
              be deleted, including:
            </Text>

            <View style={styles.modalList}>
              <View style={styles.modalListItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={feedColors.textSecondary}
                />
                <Text style={styles.modalListText}>Profile information</Text>
              </View>
              <View style={styles.modalListItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={feedColors.textSecondary}
                />
                <Text style={styles.modalListText}>Posts and comments</Text>
              </View>
              <View style={styles.modalListItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={feedColors.textSecondary}
                />
                <Text style={styles.modalListText}>Viewing history</Text>
              </View>
              <View style={styles.modalListItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={feedColors.textSecondary}
                />
                <Text style={styles.modalListText}>Circle memberships</Text>
              </View>
            </View>

            <Text style={styles.modalPasswordLabel}>
              Enter your password to confirm:
            </Text>

            <AuthInput
              label=""
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
              editable={!deleting}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeDeleteModal}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalDeleteButton,
                  deleting && styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.7}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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

  // Fixed Header
  fixedHeader: {
    backgroundColor: feedColors.background,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: feedColors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // Section
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 13,
    color: feedColors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 10,
    marginTop: 4,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 13,
    color: feedColors.textSecondary,
    lineHeight: 18,
  },

  // Danger Zone
  dangerSection: {
    padding: 24,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    margin: 24,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.error,
    marginLeft: 8,
  },
  dangerWarning: {
    fontSize: 14,
    color: feedColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: feedColors.error,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  deleteButtonIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  dangerExplanation: {
    fontSize: 12,
    color: feedColors.textTertiary,
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: feedColors.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: feedColors.text,
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: feedColors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalList: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalListText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    marginLeft: 8,
  },
  modalPasswordLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: feedColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
  },
  modalDeleteButton: {
    backgroundColor: feedColors.error,
  },
  modalDeleteButtonDisabled: {
    opacity: 0.5,
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Change Password Modal
  passwordRequirements: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 8,
  },
  passwordRequirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 6,
  },
  passwordRequirement: {
    fontSize: 12,
    color: feedColors.textSecondary,
    marginBottom: 2,
  },
  changePasswordButton: {
    backgroundColor: feedColors.primary,
  },
  changePasswordButtonDisabled: {
    opacity: 0.5,
  },
  changePasswordButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Visibility Modal
  visibilityModalContent: {
    backgroundColor: feedColors.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  visibilityModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: feedColors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  visibilityModalSubtitle: {
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  visibilityOptionSelected: {
    borderColor: feedColors.primary,
    backgroundColor: `${feedColors.primary}10`,
  },
  visibilityOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  visibilityOptionIcon: {
    marginRight: 14,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 2,
  },
  visibilityOptionLabelSelected: {
    color: feedColors.primary,
  },
  visibilityOptionDescription: {
    fontSize: 13,
    color: feedColors.textSecondary,
  },
  visibilityCloseButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  visibilityCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.textSecondary,
  },

  // Blocked Users Modal
  blockedUsersModalContent: {
    backgroundColor: feedColors.background,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  blockedUsersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  blockedUsersTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: feedColors.text,
  },
  blockedUsersLoading: {
    padding: 40,
    alignItems: "center",
  },
  blockedUsersLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: feedColors.textSecondary,
  },
  blockedUsersEmpty: {
    padding: 40,
    alignItems: "center",
  },
  blockedUsersEmptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: feedColors.text,
  },
  blockedUsersEmptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  blockedUsersList: {
    padding: 16,
  },
  blockedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  blockedUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  blockedUserAvatar: {
    marginRight: 12,
  },
  blockedUserAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  blockedUserAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: feedColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  blockedUserAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  blockedUserName: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.primary,
    minWidth: 80,
    alignItems: "center",
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.primary,
  },
});
