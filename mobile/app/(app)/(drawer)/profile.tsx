// mobile/app/(app)/(drawer)/profile.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { feedColors } from "../../../src/styles/feedStyles";
import { AuthInput } from "../../../src/components/auth/AuthInput";
import { useUser } from "../../../src/context/UserContext";
import {
  fetchCurrentUser,
  fetchStreamingServices,
  fetchUserStreamingServices,
  updateUserStreamingServices,
  fetchCircles,
} from "../../../src/lib/feed";
import { apiJson } from "../../../src/lib/api";
import { validateUsername, validateName } from "../../../src/lib/validation";
import type { CurrentUser, StreamingService, Circle } from "../../../src/types/feed";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { refreshUser } = useUser();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Streaming services
  const [allServices, setAllServices] = useState<StreamingService[]>([]);
  const [selectedServices, setSelectedServices] = useState<StreamingService[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesLoading, setServicesLoading] = useState(false);

  // Circles
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hiddenCircleIds, setHiddenCircleIds] = useState<Set<string>>(new Set());

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends" | "private">("public");
  const [showCircles, setShowCircles] = useState(true);
  const [showViewingHistory, setShowViewingHistory] = useState(true);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadStreamingServices();
    loadCircles();
    loadPrivacySettings();
  }, []);

  async function loadCircles() {
    try {
      const userCircles = await fetchCircles();
      setCircles(userCircles);

      // Load hidden circle preferences from AsyncStorage
      const stored = await AsyncStorage.getItem("hiddenCircleIds");
      if (stored) {
        const hiddenIds = JSON.parse(stored);
        setHiddenCircleIds(new Set(hiddenIds));
      } else {
        setHiddenCircleIds(new Set());
      }
    } catch (err) {
      console.error("[PROFILE] Failed to load circles:", err);
    }
  }

  async function saveHiddenCircles() {
    try {
      const hiddenArray = Array.from(hiddenCircleIds);
      await AsyncStorage.setItem("hiddenCircleIds", JSON.stringify(hiddenArray));
    } catch (err) {
      console.error("[PROFILE] Failed to save hidden circles:", err);
    }
  }

  async function loadPrivacySettings() {
    try {
      const stored = await AsyncStorage.getItem("privacySettings");
      if (stored) {
        const settings = JSON.parse(stored);
        setProfileVisibility(settings.profileVisibility || "public");
        setShowCircles(settings.showCircles !== false); // default true
        setShowViewingHistory(settings.showViewingHistory !== false); // default true
        setShowStats(settings.showStats !== false); // default true
      }
    } catch (err) {
      console.error("[PROFILE] Failed to load privacy settings:", err);
    }
  }

  async function savePrivacySettings() {
    try {
      const settings = {
        profileVisibility,
        showCircles,
        showViewingHistory,
        showStats,
      };
      await AsyncStorage.setItem("privacySettings", JSON.stringify(settings));
    } catch (err) {
      console.error("[PROFILE] Failed to save privacy settings:", err);
    }
  }

  async function loadStreamingServices() {
    try {
      setServicesLoading(true);
      const [services, userServices] = await Promise.all([
        fetchStreamingServices(),
        fetchUserStreamingServices(),
      ]);

      // Ensure services is an array
      const servicesArray = Array.isArray(services) ? services : [];
      const userServicesArray = Array.isArray(userServices) ? userServices : [];

      // Sort services by displayPriority (desc) then name (asc)
      const sortedServices = servicesArray.sort((a, b) => {
        const priorityA = a.displayPriority || 0;
        const priorityB = b.displayPriority || 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return (a.name || "").localeCompare(b.name || "");
      });

      setAllServices(sortedServices);
      setSelectedServices(userServicesArray);
    } catch (err) {
      console.error("[PROFILE] Failed to load streaming services:", err);
    } finally {
      setServicesLoading(false);
    }
  }

  async function loadUserProfile() {
    try {
      setLoading(true);
      setError("");
      const userData = await fetchCurrentUser();
      setUser(userData);

      // Split name into first and last
      const nameParts = userData.name?.split(" ") || [];
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setUsername(userData.username || "");
      setAvatarUri(userData.avatarUrl || null);
    } catch (err: any) {
      console.error("[PROFILE] Failed to load user profile:", err);
      setError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickImage() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library", "Remove Photo"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await openCamera();
          } else if (buttonIndex === 2) {
            await openLibrary();
          } else if (buttonIndex === 3) {
            setAvatarUri(null);
          }
        }
      );
    } else {
      // Android - show alert
      Alert.alert(
        "Profile Picture",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: openCamera },
          { text: "Choose from Library", onPress: openLibrary },
          { text: "Remove Photo", onPress: () => setAvatarUri(null), style: "destructive" },
        ]
      );
    }
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to take photos");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = result.assets[0].base64;
      if (base64) {
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        // Check size (600KB max)
        if (dataUrl.length > 600 * 1024) {
          Alert.alert("Image too large", "Please choose a smaller image (max 600KB)");
          return;
        }

        setAvatarUri(dataUrl);
      }
    }
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library permission is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = result.assets[0].base64;
      if (base64) {
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        // Check size (600KB max)
        if (dataUrl.length > 600 * 1024) {
          Alert.alert("Image too large", "Please choose a smaller image (max 600KB)");
          return;
        }

        setAvatarUri(dataUrl);
      }
    }
  }

  async function handleSave() {
    setFieldErrors({});

    // Validate first name
    const firstNameValidation = validateName(firstName);
    if (!firstNameValidation.valid) {
      setFieldErrors({ firstName: firstNameValidation.error! });
      return;
    }

    // Validate last name
    const lastNameValidation = validateName(lastName);
    if (!lastNameValidation.valid) {
      setFieldErrors({ lastName: lastNameValidation.error! });
      return;
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      setFieldErrors({ username: usernameValidation.error! });
      return;
    }

    try {
      setSaving(true);

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const serviceIds = selectedServices.map((s) => s._id);

      // Update profile, services, circle visibility, and privacy settings in parallel
      await Promise.all([
        apiJson("/me", {
          method: "PATCH",
          body: JSON.stringify({
            name: fullName,
            username: username.trim(),
            avatarUrl: avatarUri || undefined,
          }),
        }),
        updateUserStreamingServices(serviceIds),
        saveHiddenCircles(),
        savePrivacySettings(),
      ]);

      // Reload profile, services, and circles
      await Promise.all([loadUserProfile(), loadStreamingServices(), loadCircles(), refreshUser()]);
      setIsEditMode(false);

      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      console.error("[PROFILE] Failed to save profile:", err);

      // Check for username taken error
      if (err?.message?.toLowerCase().includes("username")) {
        setFieldErrors({ username: "Username already taken" });
      } else {
        Alert.alert("Error", err?.message || "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Reset to original values
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setUsername(user.username || "");
      setAvatarUri(user.avatarUrl || null);
    }
    setFieldErrors({});
    setSearchQuery("");
    // Reload services, circles, and privacy settings to reset selections
    loadStreamingServices();
    loadCircles();
    loadPrivacySettings();
    setIsEditMode(false);
  }

  function toggleService(service: StreamingService) {
    const isSelected = selectedServices.some((s) => s._id === service._id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter((s) => s._id !== service._id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  }

  function toggleCircleVisibility(circleId: string) {
    const newHidden = new Set(hiddenCircleIds);
    if (newHidden.has(circleId)) {
      newHidden.delete(circleId);
    } else {
      newHidden.add(circleId);
    }
    setHiddenCircleIds(newHidden);
  }

  // Define the curated list of truly popular/mainstream services
  const DEFAULT_POPULAR_SERVICE_NAMES = [
    "Netflix",
    "Hulu",
    "Disney+",
    "Prime Video",
    "Max",
    "Apple TV+",
    "Paramount+",
  ];

  // Get default popular services from allServices
  const defaultPopularServices = allServices.filter((s) =>
    DEFAULT_POPULAR_SERVICE_NAMES.includes(s.name)
  );

  // Build displayed services: selected + default popular (deduplicated)
  const displayedServiceIds = new Set<string>();
  const displayedServices: StreamingService[] = [];

  // Add selected services first
  selectedServices.forEach((service) => {
    if (!displayedServiceIds.has(service._id)) {
      displayedServiceIds.add(service._id);
      displayedServices.push(service);
    }
  });

  // Add default popular services (if not already added)
  defaultPopularServices.forEach((service) => {
    if (!displayedServiceIds.has(service._id)) {
      displayedServiceIds.add(service._id);
      displayedServices.push(service);
    }
  });

  // Sort: checked first, then unchecked
  const popularServices = displayedServices.sort((a, b) => {
    const aSelected = selectedServices.some((s) => s._id === a._id);
    const bSelected = selectedServices.some((s) => s._id === b._id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  // Filter services based on search query (exclude already displayed services)
  const filteredServices = searchQuery.trim()
    ? allServices.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !displayedServiceIds.has(s._id)
      )
    : [];

  // Separate circles by visibility
  const publicCircles = circles.filter((c) => c.visibility !== "private");
  const privateCircles = circles.filter((c) => c.visibility === "private");

  // Circles to display in view mode (only public circles that are not hidden)
  const visibleCircles = publicCircles.filter((c) => !hiddenCircleIds.has(c.id));

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => (navigation as any).openDrawer?.()}
              style={styles.hamburgerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="menu" size={28} color="#f1f5f9" />
            </Pressable>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={feedColors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => (navigation as any).openDrawer?.()}
              style={styles.hamburgerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="menu" size={28} color="#f1f5f9" />
            </Pressable>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Failed to load profile"}
          </Text>
        </View>
      </View>
    );
  }

  // Get first letter of name for avatar fallback
  const initial = (isEditMode ? firstName : user.name)?.charAt(0)?.toUpperCase() || "?";

  return (
    <View style={styles.container}>
      {/* Fixed Header - Contains navigation and action buttons */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* Left: Hamburger Menu */}
          <Pressable
            onPress={() => (navigation as any).openDrawer?.()}
            style={styles.hamburgerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color="#f1f5f9" />
          </Pressable>

          {/* Center: BFFlix Logo (hidden in edit mode) */}
          {!isEditMode && (
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/bfflix-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Right: Edit/Save/Cancel Buttons */}
          <View style={styles.headerActions}>
            {!isEditMode ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditMode(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={feedColors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={isEditMode ? handlePickImage : undefined}
            activeOpacity={isEditMode ? 0.7 : 1}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            {isEditMode && (
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera" size={32} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          {!isEditMode ? (
            // View Mode
            <>
              <Text style={styles.name}>{user.name}</Text>
              {user.username && (
                <Text style={styles.username}>{user.username}</Text>
              )}
              <Text style={styles.email}>{user.email}</Text>
            </>
          ) : (
            // Edit Mode
            <View style={styles.editForm}>
              <AuthInput
                label="First Name"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setFieldErrors({ ...fieldErrors, firstName: "" });
                }}
                placeholder="John"
                autoCapitalize="words"
                error={fieldErrors.firstName}
              />

              <AuthInput
                label="Last Name"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setFieldErrors({ ...fieldErrors, lastName: "" });
                }}
                placeholder="Doe"
                autoCapitalize="words"
                error={fieldErrors.lastName}
              />

              <AuthInput
                label="Username"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setFieldErrors({ ...fieldErrors, username: "" });
                }}
                placeholder="johndoe"
                autoCapitalize="none"
                error={fieldErrors.username}
              />

              <View style={styles.emailReadOnly}>
                <Text style={styles.emailLabel}>Email</Text>
                <Text style={styles.emailValue}>{user.email}</Text>
                <Text style={styles.emailHint}>Email cannot be changed</Text>
              </View>
            </View>
          )}
        </View>

        {/* Streaming Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Services</Text>

          {isEditMode ? (
            <>
              {servicesLoading ? (
                <View style={styles.servicesLoadingContainer}>
                  <ActivityIndicator size="small" color={feedColors.primary} />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : allServices.length === 0 ? (
                <Text style={styles.placeholderText}>
                  No streaming services available
                </Text>
              ) : (
                <>
                  {/* Popular Services - Curated mainstream + user's selected services */}
                  {popularServices.length > 0 && !searchQuery.trim() && (
                    <>
                      <Text style={styles.servicesSubtitle}>My Streaming Services</Text>
                      <Text style={styles.servicesHint}>
                        {selectedServices.length > 0
                          ? "Tap to add or remove services"
                          : "Select the services you have"}
                      </Text>
                      <View style={styles.servicesGrid}>
                        {popularServices.map((service) => {
                          const isSelected = selectedServices.some((s) => s._id === service._id);
                          return (
                            <TouchableOpacity
                              key={service._id}
                              style={[
                                styles.serviceCard,
                                isSelected && styles.serviceCardSelected,
                              ]}
                              onPress={() => toggleService(service)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.serviceContent}>
                                <Text style={styles.serviceName}>{service.name}</Text>
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color={feedColors.primary}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Search bar */}
                  {!searchQuery.trim() && popularServices.length > 0 && (
                    <Text style={styles.servicesSearchHint}>
                      Don't see your service? Search below to add it.
                    </Text>
                  )}

                  <AuthInput
                    label=""
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search for other services..."
                    autoCapitalize="none"
                  />

                  {/* Search Results - Only shown when actively searching */}
                  {searchQuery.trim() && (
                    filteredServices.length > 0 ? (
                      <>
                        <Text style={styles.servicesSubtitle}>Search Results</Text>
                        <Text style={styles.servicesHint}>
                          Tap to add to your services list above
                        </Text>
                        <View style={styles.servicesGrid}>
                          {filteredServices.map((service) => {
                            const isSelected = selectedServices.some((s) => s._id === service._id);
                            return (
                              <TouchableOpacity
                                key={service._id}
                                style={[
                                  styles.serviceCard,
                                  isSelected && styles.serviceCardSelected,
                                ]}
                                onPress={() => toggleService(service)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.serviceContent}>
                                  <Text style={styles.serviceName}>{service.name}</Text>
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={20}
                                      color={feedColors.primary}
                                    />
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.placeholderText}>
                        No services match "{searchQuery}"
                      </Text>
                    )
                  )}

                  {/* Selected count */}
                  {selectedServices.length > 0 && (
                    <Text style={styles.selectedCountText}>
                      {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                    </Text>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {selectedServices.length > 0 ? (
                <View style={styles.servicesDisplay}>
                  {selectedServices.map((service) => (
                    <View key={service._id} style={styles.serviceBadge}>
                      <Text style={styles.serviceBadgeText}>{service.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  No streaming services selected
                </Text>
              )}
            </>
          )}
        </View>

        {/* My Circles Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Circles</Text>

          {isEditMode ? (
            <>
              {/* Edit mode: Show toggles for public circles, list private circles */}
              <Text style={styles.sectionSubtitle}>
                Choose which public circles to show on your profile
              </Text>

              {publicCircles.length > 0 ? (
                <View style={styles.circlesList}>
                  {publicCircles.map((circle) => {
                    const isHidden = hiddenCircleIds.has(circle.id);
                    return (
                      <TouchableOpacity
                        key={circle.id}
                        style={styles.circleToggleRow}
                        onPress={() => toggleCircleVisibility(circle.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.circleInfo}>
                          <View style={styles.circleHeader}>
                            <Text style={styles.circleName}>{circle.name}</Text>
                            <View style={styles.publicBadge}>
                              <Text style={styles.publicBadgeText}>Public</Text>
                            </View>
                          </View>
                          {circle.description && (
                            <Text style={styles.circleDescription} numberOfLines={1}>
                              {circle.description}
                            </Text>
                          )}
                        </View>
                        <Ionicons
                          name={isHidden ? "eye-off-outline" : "eye-outline"}
                          size={24}
                          color={isHidden ? feedColors.textTertiary : feedColors.primary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.placeholderText}>No public circles</Text>
              )}

              {/* Show private circles (always hidden from public) */}
              {privateCircles.length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { marginTop: 24 }]}>
                    Private Circles (never shown publicly)
                  </Text>
                  <View style={styles.circlesList}>
                    {privateCircles.map((circle) => (
                      <View key={circle.id} style={styles.circleRow}>
                        <View style={styles.circleInfo}>
                          <View style={styles.circleHeader}>
                            <Text style={styles.circleName}>{circle.name}</Text>
                            <View style={styles.privateBadge}>
                              <Ionicons name="lock-closed" size={12} color="#ffffff" />
                              <Text style={styles.privateBadgeText}>Private</Text>
                            </View>
                          </View>
                          {circle.description && (
                            <Text style={styles.circleDescription} numberOfLines={1}>
                              {circle.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {/* View mode: Show only visible public circles */}
              {visibleCircles.length > 0 ? (
                <View style={styles.circlesList}>
                  {visibleCircles.map((circle) => (
                    <View key={circle.id} style={styles.circleCard}>
                      <View style={styles.circleCardHeader}>
                        <Text style={styles.circleCardName}>{circle.name}</Text>
                        <View style={styles.publicBadge}>
                          <Text style={styles.publicBadgeText}>Public</Text>
                        </View>
                      </View>
                      {circle.description && (
                        <Text style={styles.circleCardDescription} numberOfLines={2}>
                          {circle.description}
                        </Text>
                      )}
                      <View style={styles.circleCardStats}>
                        <Text style={styles.circleCardStat}>
                          {circle.membersCount || 0} members
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  No circles to display
                </Text>
              )}
            </>
          )}
        </View>

        {/* Privacy Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>

          {isEditMode ? (
            <>
              {/* Profile Visibility */}
              <Text style={styles.settingLabel}>Profile Visibility</Text>
              <Text style={styles.settingDescription}>
                Control who can see your profile information
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setProfileVisibility("public")}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    {profileVisibility === "public" && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Public</Text>
                    <Text style={styles.radioSubtext}>Anyone can view your profile</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setProfileVisibility("friends")}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    {profileVisibility === "friends" && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Friends Only</Text>
                    <Text style={styles.radioSubtext}>Only your friends can see your profile</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setProfileVisibility("private")}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    {profileVisibility === "private" && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Private</Text>
                    <Text style={styles.radioSubtext}>Only you can see your profile</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Show/Hide Toggles */}
              <View style={styles.togglesContainer}>
                <View style={styles.dividerLine} />

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setShowCircles(!showCircles)}
                  activeOpacity={0.7}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show My Circles</Text>
                    <Text style={styles.toggleSubtext}>
                      Display public circles on your profile
                    </Text>
                  </View>
                  <View style={[styles.toggleSwitch, showCircles && styles.toggleSwitchActive]}>
                    <View style={[styles.toggleThumb, showCircles && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setShowViewingHistory(!showViewingHistory)}
                  activeOpacity={0.7}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Viewing History</Text>
                    <Text style={styles.toggleSubtext}>
                      Display your recently watched content
                    </Text>
                  </View>
                  <View style={[styles.toggleSwitch, showViewingHistory && styles.toggleSwitchActive]}>
                    <View style={[styles.toggleThumb, showViewingHistory && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setShowStats(!showStats)}
                  activeOpacity={0.7}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show Stats</Text>
                    <Text style={styles.toggleSubtext}>
                      Display your viewing statistics
                    </Text>
                  </View>
                  <View style={[styles.toggleSwitch, showStats && styles.toggleSwitchActive]}>
                    <View style={[styles.toggleThumb, showStats && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* View mode: Display current privacy settings */}
              <View style={styles.privacySettingsView}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingRowLabel}>Profile Visibility</Text>
                  <View style={styles.settingValueBadge}>
                    <Text style={styles.settingValueText}>
                      {profileVisibility === "public" && "Public"}
                      {profileVisibility === "friends" && "Friends Only"}
                      {profileVisibility === "private" && "Private"}
                    </Text>
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingRowLabel}>Show Circles</Text>
                  <Ionicons
                    name={showCircles ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={showCircles ? feedColors.success : feedColors.textTertiary}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingRowLabel}>Show Viewing History</Text>
                  <Ionicons
                    name={showViewingHistory ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={showViewingHistory ? feedColors.success : feedColors.textTertiary}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingRowLabel}>Show Stats</Text>
                  <Ionicons
                    name={showStats ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={showStats ? feedColors.success : feedColors.textTertiary}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Placeholder sections for future features */}
        {!isEditMode && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Viewings</Text>
              <Text style={styles.placeholderText}>No viewings yet</Text>
            </View>
          </>
        )}
      </ScrollView>
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
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: feedColors.error,
    textAlign: "center",
  },

  // Fixed Header - Stays at top while content scrolls
  fixedHeader: {
    backgroundColor: feedColors.background,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 22,
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  logo: {
    height: 32,
    width: 120,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: feedColors.backgroundSecondary,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: feedColors.primary,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.primary,
    marginLeft: 3,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: feedColors.primary,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },

  // Profile Header
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarFallback: {
    backgroundColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#ffffff",
  },
  avatarEditOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: feedColors.textSecondary,
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: feedColors.textTertiary,
  },

  // Edit Form
  editForm: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emailReadOnly: {
    marginTop: 16,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 6,
  },
  emailValue: {
    fontSize: 16,
    color: feedColors.textSecondary,
    marginBottom: 4,
  },
  emailHint: {
    fontSize: 12,
    color: feedColors.textTertiary,
    fontStyle: "italic",
  },

  // Sections
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: feedColors.textSecondary,
    fontStyle: "italic",
  },

  // Streaming Services
  servicesLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  servicesSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  servicesHint: {
    fontSize: 12,
    color: feedColors.textSecondary,
    marginBottom: 8,
    fontStyle: "italic",
  },
  servicesSearchHint: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  serviceCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
    minWidth: 100,
  },
  serviceCardSelected: {
    borderColor: feedColors.primary,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    borderWidth: 2,
  },
  serviceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: feedColors.text,
  },
  servicesDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: feedColors.primary,
  },
  serviceBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: feedColors.primary,
    marginTop: 12,
    textAlign: "center",
  },

  // Circles
  sectionSubtitle: {
    fontSize: 14,
    color: feedColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  circlesList: {
    gap: 12,
  },
  circleToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
  },
  circleRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
  },
  circleInfo: {
    flex: 1,
    marginRight: 12,
  },
  circleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  circleName: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
  },
  circleDescription: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginTop: 2,
  },
  publicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  privateBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
  },

  // Circle cards (view mode)
  circleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
    marginBottom: 12,
  },
  circleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  circleCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: feedColors.text,
    flex: 1,
  },
  circleCardDescription: {
    fontSize: 14,
    color: feedColors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  circleCardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleCardStat: {
    fontSize: 13,
    color: feedColors.textTertiary,
  },

  // Privacy Settings
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 4,
    marginTop: 8,
  },
  settingDescription: {
    fontSize: 13,
    color: feedColors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  radioGroup: {
    gap: 12,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: feedColors.backgroundSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: feedColors.primary,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 2,
  },
  radioSubtext: {
    fontSize: 12,
    color: feedColors.textSecondary,
  },
  togglesContainer: {
    marginTop: 8,
  },
  dividerLine: {
    height: 1,
    backgroundColor: feedColors.border,
    marginVertical: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: feedColors.backgroundSecondary,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
    marginBottom: 2,
  },
  toggleSubtext: {
    fontSize: 12,
    color: feedColors.textSecondary,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: feedColors.border,
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: feedColors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  privacySettingsView: {
    gap: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: feedColors.backgroundSecondary,
  },
  settingRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: feedColors.text,
  },
  settingValueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: feedColors.primary,
  },
  settingValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
});
