import React from 'react';
import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Home, Calendar, Bell, User, Settings } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { View, Text, StyleSheet } from 'react-native';

function BadgeIcon({ icon: Icon, color, size, unread }: { icon: any; color: string; size: number; unread?: number }) {
  return (
    <View style={{ position: 'relative' }}>
      <Icon color={color} size={size} />
      {unread != null && unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (!user) return null;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: theme.colors.tabBarBackground, borderTopColor: theme.colors.tabBarBorder },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textTertiary,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <BadgeIcon icon={Bell} color={color} size={size} unread={unreadCount} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tabs>
  );
}
