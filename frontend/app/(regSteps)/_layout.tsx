import { Stack} from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen name="basicProfile" options={{ headerShown: false }} />
      <Stack.Screen name="driverLicense" options={{ headerShown: false }} />
      <Stack.Screen name="registerSelfie" options={{ headerShown: false }} />
      <Stack.Screen name="vehicleInfo" options={{ headerShown: false }} />
    </Stack>
    );
}
