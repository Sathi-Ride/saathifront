import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerShown: false }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', headerShown: false }}
      />
    </Tabs>
  );
}
