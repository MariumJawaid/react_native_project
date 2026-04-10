import { Stack } from "expo-router";
import React from "react";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="caregiver/dashboard" />
      <Stack.Screen name="caregiver/notifications" />
      <Stack.Screen name="patient/dashboard" />
      <Stack.Screen name="patient/conduct-test" />
      <Stack.Screen name="patient/test-results" />
      <Stack.Screen name="patient/voice-test-conductor" />
      <Stack.Screen name="patient/voice-session-summary" />
      <Stack.Screen name="patient/dashboard-updated" />
    </Stack>
  );
}
