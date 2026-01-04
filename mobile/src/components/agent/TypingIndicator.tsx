// mobile/src/components/agent/TypingIndicator.tsx

import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { agentStyles } from "../../styles/agentStyles";

export function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create a bouncing animation for each dot with staggered delays
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createAnimation(dot1, 0);
    const animation2 = createAnimation(dot2, 150);
    const animation3 = createAnimation(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={agentStyles.typingIndicatorContainer}>
      <View style={agentStyles.typingIndicatorBubble}>
        <Animated.View
          style={[
            agentStyles.typingDot,
            { transform: [{ translateY: dot1 }] },
          ]}
        />
        <Animated.View
          style={[
            agentStyles.typingDot,
            { transform: [{ translateY: dot2 }] },
          ]}
        />
        <Animated.View
          style={[
            agentStyles.typingDot,
            { transform: [{ translateY: dot3 }] },
          ]}
        />
      </View>
    </View>
  );
}
