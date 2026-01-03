// mobile/app/(app)/(drawer)/circles.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "../../../src/components/feed/AppBar";
import { feedColors } from "../../../src/styles/feedStyles";

export default function CirclesScreen() {
  return (
    <View style={styles.container}>
      <AppBar />
      <SafeAreaView style={styles.content}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.icon}>👥</Text>
          <Text style={styles.title}>Circles</Text>
          <Text style={styles.description}>
            Coming Soon! This feature will let you organize your friends into
            different circles.
          </Text>
        </View>
      </SafeAreaView>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  placeholderContainer: {
    alignItems: "center",
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: feedColors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: feedColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
});
