// mobile/app/(app)/_layout.tsx
import { Stack } from "expo-router";

export default function AppLayout() {
  // Auth navigation is handled at root level in app/_layout.tsx
  return <Stack screenOptions={{ headerShown: false }} />;
}