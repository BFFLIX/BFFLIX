// mobile/app/(app)/(tabs)/index.tsx

import { View, Text, Pressable } from "react-native";
import { useAuth } from "../../../src/auth/AuthContext";

export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Welcome to BFFLIX</Text>
      <Text style={{ fontSize: 14, opacity: 0.7, textAlign: "center" }}>
        Home screen placeholder. Next we'll wire up the feed.
      </Text>

      <Pressable
        onPress={logout}
        style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 }}
      >
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}
