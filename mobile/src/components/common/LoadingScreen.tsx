// mobile/src/components/common/LoadingScreen.tsx

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { BrandLogo } from "./BrandLogo";

type LoadingScreenProps = {
  /**
   * Whether the loading screen is visible
   */
  visible: boolean;
  /**
   * Callback when animation completes (after fade out)
   */
  onAnimationComplete?: () => void;
};

/**
 * Animated loading/splash screen for BFFlix
 *
 * Shows the brand logo with a Netflix/Prime-style animation:
 * - Fade in + scale up
 * - Subtle bounce
 * - Fade out when complete
 *
 * Use during app initialization (auth restore, font loading, etc.)
 *
 * @example
 * const [isLoading, setIsLoading] = useState(true);
 *
 * useEffect(() => {
 *   async function init() {
 *     await restoreAuth();
 *     setIsLoading(false);
 *   }
 *   init();
 * }, []);
 *
 * <LoadingScreen
 *   visible={isLoading}
 *   onAnimationComplete={() => console.log('Done!')}
 * />
 */
export function LoadingScreen({
  visible,
  onAnimationComplete,
}: LoadingScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      // Entry animation: fade in + scale up + bounce
      Animated.sequence([
        // Fade in and scale up simultaneously
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.05, // Slightly larger for bounce effect
            duration: 600,
            easing: Easing.out(Easing.back(1.5)), // Back easing for bounce
            useNativeDriver: true,
          }),
        ]),
        // Subtle settle
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation: fade out
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }
  }, [visible, opacity, scale, onAnimationComplete]);

  if (!visible && opacity._value === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <BrandLogo height={96} accessibilityLabel="BFFlix - Loading" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#05010f", // Match auth background
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
