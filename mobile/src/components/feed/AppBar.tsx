// mobile/src/components/feed/AppBar.tsx

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { BrandLogo } from "../common/BrandLogo";
import { feedColors } from "../../styles/feedStyles";

export function AppBar() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Check if drawer is available
  const hasDrawer = typeof (navigation as any).openDrawer === 'function';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Hamburger Menu or Back Button */}
        <Pressable
          onPress={() => {
            if (hasDrawer) {
              (navigation as any).openDrawer();
            } else {
              router.back();
            }
          }}
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={hasDrawer ? "menu" : "arrow-back"}
            size={28}
            color={feedColors.text}
          />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <BrandLogo height="responsive" />
        </View>

        {/* Right side spacer for balance */}
        <View style={styles.rightSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: feedColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },
  content: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: feedColors.primary,
    letterSpacing: -0.5,
  },
  rightSpacer: {
    width: 44,
  },
});
