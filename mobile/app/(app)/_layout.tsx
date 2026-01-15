// mobile/app/(app)/_layout.tsx
import { Stack } from "expo-router";
import { UserProvider } from "../../src/context/UserContext";

export default function AppLayout() {
  // Auth navigation is handled at root level in app/_layout.tsx
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UserProvider>
  );
}