// mobile/src/components/drawer/DrawerMenuItem.tsx

import React from "react";
import { Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { drawerStyles } from "../../styles/drawerStyles";

type DrawerMenuItemProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
};

export function DrawerMenuItem({
  label,
  icon,
  isActive,
  onPress,
}: DrawerMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        drawerStyles.menuItem,
        isActive ? drawerStyles.menuItemActive : drawerStyles.menuItemInactive,
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={isActive ? "#ec4899" : "#8E8E93"}
        style={drawerStyles.menuItemIcon}
      />
      <Text
        style={[
          drawerStyles.menuItemText,
          isActive
            ? drawerStyles.menuItemTextActive
            : drawerStyles.menuItemTextInactive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
