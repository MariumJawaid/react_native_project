import { Stack } from "expo-router";
import React from "react";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="caregiver/dashboard" />
      <Stack.Screen name="caregiver/notifications" />
      <Stack.Screen name="caregiver/lifestyle-recommendations" />
      <Stack.Screen name="caregiver/teleconsultation" />
      <Stack.Screen name="caregiver/realtime-monitoring" />
      <Stack.Screen name="caregiver/patient-graphs" />
      <Stack.Screen name="caregiver/browse-doctors" />
      <Stack.Screen name="caregiver/add-patient" />
      <Stack.Screen name="caregiver/contact-clinician" />
      <Stack.Screen name="caregiver/upload-mri" />
      <Stack.Screen name="caregiver/location-map" />
      <Stack.Screen name="patient/dashboard" />
    </Stack>
  );
}
