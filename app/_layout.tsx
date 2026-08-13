import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import InnerApp from './InnerApp';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <SettingsProvider>
        <InnerApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
