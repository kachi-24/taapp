import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { Bell, Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { notifications, markAsRead, markAllAsRead, dismissNotification, loading } = useNotifications();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
    markAllText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    item: { marginHorizontal: 16, marginVertical: 4, borderRadius: 14, padding: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', gap: 12 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 4 },
    content: { flex: 1 },
    nTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
    nBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
    nTime: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
    readBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.colors.primaryLight },
    readText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>Notifications</Text>
          {notifications.some(n => !n.is_read) && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllAsRead}>
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[s.item, item.is_read && { opacity: 0.6 }]}>
            {!item.is_read && <View style={s.unreadDot} />}
            <View style={s.content}>
              <Text style={s.nTitle}>{item.title}</Text>
              <Text style={s.nBody}>{item.body}</Text>
              <Text style={s.nTime}>{new Date(item.scheduled_for).toLocaleString()}</Text>
              <View style={s.actions}>
                {!item.is_read && (
                  <TouchableOpacity style={s.readBtn} onPress={() => markAsRead(item.id)}>
                    <Text style={s.readText}>Mark read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.readBtn, { backgroundColor: theme.colors.errorLight }]} onPress={() => dismissNotification(item.id)}>
                  <Text style={[s.readText, { color: theme.colors.error }]}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Bell color={theme.colors.textTertiary} size={40} />
            <Text style={s.emptyText}>No notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
