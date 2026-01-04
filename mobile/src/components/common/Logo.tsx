// mobile/src/components/common/Logo.tsx

import React from "react";
import { View, Image, StyleSheet } from "react-native";

type LogoProps = {
  size?: "small" | "medium" | "large";
};

export function Logo({ size = "medium" }: LogoProps) {
  const height = size === "large" ? 80 : size === "small" ? 40 : 60;

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/bfflix-logo.png")}
        style={[styles.logo, { height }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "auto",
    aspectRatio: 1920 / 1080, // Original SVG aspect ratio
  },
});
