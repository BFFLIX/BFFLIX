// mobile/app/(app)/user/_layout.tsx

import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
