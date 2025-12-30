// mobile/app/(app)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";

export default function AppLayout() {
  const { isReady, isAuthed } = useAuth();

  if (!isReady) return null;

  if (!isAuthed) {
    // Typed route lists can lag behind during template edits; use a typed Href object.
    const loginHref = { pathname: "/(auth)/login" } as unknown as Href;
    return <Redirect href={loginHref} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}