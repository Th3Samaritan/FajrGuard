import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0C1A2E',
        borderTopColor: 'rgba(201,162,39,0.18)',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#C9A227',
      tabBarInactiveTintColor: 'rgba(240,230,211,0.4)',
      tabBarLabelStyle: {
        fontSize: 11,
        fontFamily: 'CormorantGaramond',
      },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Prayer Times',
        tabBarIcon: ({ color }) => null,
      }} />
      <Tabs.Screen name="streak" options={{
        title: 'Streak',
        tabBarIcon: ({ color }) => null,
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarIcon: ({ color }) => null,
      }} />
    </Tabs>
  );
}
