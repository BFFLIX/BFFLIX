// mobile/src/components/feed/CreatePostFAB.tsx

import React from "react";
import { Pressable, Text } from "react-native";
import { feedStyles } from "../../styles/feedStyles";

type CreatePostFABProps = {
  onPress: () => void;
};

export function CreatePostFAB({ onPress }: CreatePostFABProps) {
  return (
    <Pressable
      onPress={onPress}
      style={feedStyles.fab}
      android_ripple={{ color: "rgba(255, 255, 255, 0.2)" }}
    >
      <Text style={feedStyles.fabIcon}>+</Text>
    </Pressable>
  );
}
