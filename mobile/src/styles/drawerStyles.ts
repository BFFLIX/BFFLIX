// mobile/src/styles/drawerStyles.ts

import { StyleSheet } from "react-native";
import { feedColors } from "./feedStyles";

export const drawerColors = {
  ...feedColors,
  drawerBackground: "#05010f",
  drawerItemBackground: "rgba(255, 255, 255, 0.03)",
  drawerItemActive: "#ec4899",
  drawerItemInactive: "#8E8E93",
  drawerBorder: "rgba(255, 255, 255, 0.08)",
};

export const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: drawerColors.drawerBackground,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: drawerColors.drawerBorder,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: drawerColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  userName: {
    color: drawerColors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    color: drawerColors.textSecondary,
    fontSize: 14,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: drawerColors.drawerItemBackground,
    borderLeftWidth: 3,
    borderLeftColor: drawerColors.drawerItemActive,
  },
  menuItemInactive: {
    backgroundColor: "transparent",
  },
  menuItemIcon: {
    marginRight: 16,
    width: 24,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemTextActive: {
    color: drawerColors.drawerItemActive,
  },
  menuItemTextInactive: {
    color: drawerColors.drawerItemInactive,
  },
});
