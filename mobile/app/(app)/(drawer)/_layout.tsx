// mobile/app/(app)/(drawer)/_layout.tsx

import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DrawerContent } from "../../../src/components/drawer/DrawerContent";

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: "#05010f",
            width: 280,
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: "Home",
            drawerLabel: "Home",
          }}
        />
        <Drawer.Screen
          name="circles"
          options={{
            title: "Circles",
            drawerLabel: "Circles",
          }}
        />
        <Drawer.Screen
          name="viewings"
          options={{
            title: "Viewings",
            drawerLabel: "Viewings",
          }}
        />
        <Drawer.Screen
          name="agent"
          options={{
            title: "AI Agent",
            drawerLabel: "AI Agent",
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            title: "Profile",
            drawerLabel: "Profile",
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            title: "Settings",
            drawerLabel: "Settings",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
