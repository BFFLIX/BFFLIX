// mobile/app/(app)/(drawer)/settings.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { feedColors } from "../../../src/styles/feedStyles";
import { HamburgerButton } from "../../../src/components/drawer/HamburgerButton";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <HamburgerButton />
      <View style={styles.content}>
        <Text style={styles.text}>Settings Screen - Coming Soon</Text>
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
  },
  text: {
    color: feedColors.text,
    fontSize: 18,
  },
});
