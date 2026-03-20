import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { colors } from "@/lib/theme";

interface TabIconProps {
  emoji: string;
  focused: boolean;
}

function TabIcon({ emoji, focused }: TabIconProps) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Capture",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✏️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📒" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="☑️" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
