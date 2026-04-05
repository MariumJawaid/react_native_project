import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SplashScreen from 'expo-splash-screen';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="(auth)"
        options={{
          href: null, // hide from tab bar if you want
        }}
      />
      <Tabs.Screen
        name="(app)"
        options={{
          href: null, // hide from tab bar if you want
        }}
      />
    </Tabs>
  );
}
