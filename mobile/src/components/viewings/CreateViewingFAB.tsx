// mobile/src/components/viewings/CreateViewingFAB.tsx

import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { feedStyles } from "../../styles/feedStyles";

type CreateViewingFABProps = {
  onPress: () => void;
};

export function CreateViewingFAB({ onPress }: CreateViewingFABProps) {
  return (
    <Pressable onPress={onPress} style={feedStyles.fab}>
      <Ionicons name="add" size={32} color="#fff" />
    </Pressable>
  );
}
