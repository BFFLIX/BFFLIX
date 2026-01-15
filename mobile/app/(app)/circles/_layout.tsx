// mobile/app/(app)/circles/_layout.tsx

import { Stack } from "expo-router";

export default function CirclesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/members" />
      <Stack.Screen name="[id]/settings" />
      <Stack.Screen name="[id]/moderate" />
    </Stack>
  );
}
