// mobile/app/(app)/(drawer)/profile.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { feedColors } from "../../../src/styles/feedStyles";
import { HamburgerButton } from "../../../src/components/drawer/HamburgerButton";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <HamburgerButton />
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Profile placeholder. Next we'll load /me and show user info.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: feedColors.text,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    color: feedColors.textSecondary,
  },
});
