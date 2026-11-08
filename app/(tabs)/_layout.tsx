import React from 'react';
import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
export default function TabLayout() {
  const t = useTheme(),
    insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.line,
          height: 66 + Math.max(12, insets.bottom),
          paddingTop: 12,
          paddingBottom: Math.max(12, insets.bottom),
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 5 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="sun"
              color={typeof color === 'string' ? color : t.primary}
              size={size - 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="calendar"
              color={typeof color === 'string' ? color : t.primary}
              size={size - 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="bar-chart-2"
              color={typeof color === 'string' ? color : t.primary}
              size={size - 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="sliders"
              color={typeof color === 'string' ? color : t.primary}
              size={size - 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
