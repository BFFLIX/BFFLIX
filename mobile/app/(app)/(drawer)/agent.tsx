// mobile/app/(app)/(drawer)/agent.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { feedColors } from "../../../src/styles/feedStyles";
import { HamburgerButton } from "../../../src/components/drawer/HamburgerButton";

export default function AgentScreen() {
  return (
    <View style={styles.container}>
      <HamburgerButton />
      <View style={styles.content}>
        <Text style={styles.text}>AI Agent - Coming Soon</Text>
        <Text style={styles.subtitle}>
          Get personalized movie and TV recommendations from our AI agent
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
  text: {
    color: feedColors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: feedColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
