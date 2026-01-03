import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthInitializer>
        <RootNavigator />
      </AuthInitializer>
    </AuthProvider>
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuth();

  // BLOCK all rendering until auth check completes
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  // Only render children (RootNavigator) after isReady = true
  return <>{children}</>;
}

function RootNavigator() {
  const { isAuthed } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthed && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthed && inAuthGroup) {
      router.replace("/(app)/(drawer)");
    }
  }, [isAuthed, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});