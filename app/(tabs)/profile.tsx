import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { User, Mail, LogOut } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActivities } from '@/contexts/ActivityContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { activities } = useActivities();

  const completedCount = activities.filter(a => a.is_completed).length;
  const totalCount = activities.length;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    avatarSection: { alignItems: 'center', paddingVertical: 32 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
    name: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    email: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
    statNum: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
    statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    section: { marginHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    row: { backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderColor: theme.colors.divider },
    rowText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    rowValue: { marginLeft: 'auto', fontSize: 14, color: theme.colors.textSecondary },
    logoutBtn: { marginHorizontal: 20, padding: 16, borderRadius: 12, backgroundColor: theme.colors.errorLight, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    logoutText: { fontSize: 15, fontWeight: '600', color: theme.colors.error },
  });

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{totalCount}</Text>
          <Text style={s.statLabel}>Total Activities</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{completedCount}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{totalCount - completedCount}</Text>
          <Text style={s.statLabel}>Remaining</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.row}>
          <View style={s.rowItem}>
            <Mail color={theme.colors.textSecondary} size={18} />
            <Text style={s.rowText}>Email</Text>
            <Text style={s.rowValue} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <LogOut color={theme.colors.error} size={18} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
