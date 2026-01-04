// mobile/src/components/drawer/DrawerContent.tsx

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { drawerStyles } from "../../styles/drawerStyles";
import { DrawerMenuItem } from "./DrawerMenuItem";
import { fetchCurrentUser } from "../../lib/feed";
import { useAuth } from "../../auth/AuthContext";

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isAuthed, isReady } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string>("");

  useEffect(() => {
    // CRITICAL: Only fetch user if authenticated
    if (!isReady || !isAuthed) {
      console.log('[DRAWER] Skipping fetchCurrentUser - isReady:', isReady, 'isAuthed:', isAuthed);
      setUserName("Guest");
      return;
    }

    console.log('[DRAWER] Fetching current user...');
    (async () => {
      try {
        const user = await fetchCurrentUser();
        setUserName(user.name || "User");
        setProfilePicture(user.profilePicture || "");
        console.log('[DRAWER] Fetched user:', user.name);
      } catch (err) {
        console.error("[DRAWER] Failed to fetch current user:", err);
        setUserName("User");
      }
    })();
  }, [isReady, isAuthed]);

  const getInitials = (name: string): string => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      props.navigation.closeDrawer();
      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const menuItems = [
    { route: "/", label: "Home", icon: "home" as const },
    { route: "/circles", label: "Circles", icon: "people" as const },
    { route: "/viewings", label: "Viewings", icon: "film" as const },
    { route: "/agent", label: "AI Agent", icon: "sparkles" as const },
    { route: "/profile", label: "Profile", icon: "person" as const },
    { route: "/settings", label: "Settings", icon: "settings" as const },
  ];

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} style={drawerStyles.container}>
        {/* Header with user info */}
        <View style={styles.header}>
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
          )}
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {userName}
          </Text>
        </View>

        {/* Menu items */}
        <View style={drawerStyles.menuContainer}>
          {menuItems.map((item) => (
            <DrawerMenuItem
              key={item.route}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.route}
              onPress={() => {
                router.push(item.route);
                props.navigation.closeDrawer();
              }}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Logout Button - at bottom */}
      <View style={styles.logoutContainer}>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 8,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ec4899",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  logoutContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
    marginLeft: 12,
  },
});
