// mobile/src/components/drawer/HamburgerButton.tsx

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "@react-navigation/drawer";

export function HamburgerButton() {
  const navigation = useNavigation<DrawerNavigationProp<{}>>();

  return (
    <Pressable
      onPress={() => navigation.openDrawer()}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu" size={28} color="#f1f5f9" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 22,
  },
});
