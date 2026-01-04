// mobile/src/components/common/BrandLogo.tsx

import React from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";

type BrandLogoProps = {
  /**
   * Height in dp (density-independent pixels)
   * - If number: exact height
   * - If "responsive": scales with screen width
   * - If undefined: uses responsive default
   */
  height?: number | "responsive";
  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
};

/**
 * BFFlix brand logo component
 *
 * The logo automatically maintains its aspect ratio (16:9).
 * Uses high-quality PNG export of the actual brand logo.
 *
 * @example
 * // Login screen (large, fixed)
 * <BrandLogo height={72} />
 *
 * @example
 * // Header (small, responsive)
 * <BrandLogo height="responsive" />
 */
export function BrandLogo({
  height = "responsive",
  accessibilityLabel = "BFFlix Logo"
}: BrandLogoProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate responsive height based on screen width
  // Mobile screens typically 320-428px wide
  // We want logo to be ~15-20% of screen width on headers
  const getHeight = (): number => {
    if (typeof height === "number") {
      return height;
    }

    // Responsive sizing
    // Small phones (~320px): 28dp
    // Medium phones (~375px): 32dp
    // Large phones (~428px): 36dp
    return Math.max(28, Math.min(36, screenWidth * 0.085));
  };

  const logoHeight = getHeight();
  // PNG dimensions: 2048x1152, aspect ratio 16:9 = 1.778
  const logoWidth = logoHeight * 1.778;

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={require("../../../assets/bfflix-logo.png")}
        style={[
          styles.logo,
          {
            width: logoWidth,
            height: logoHeight,
          },
        ]}
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
    // Width and height set dynamically
  },
});
