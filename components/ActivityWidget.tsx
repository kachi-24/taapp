import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity } from '@/types/activity';

interface Props {
  activity: Activity;
  onPress?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  class: '#3B82F6', study: '#8B5CF6', work: '#F59E0B',
  personal: '#EC4899', health: '#10B981', social: '#F97316', other: '#94A3B8',
};

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function getTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  return `in ${h}h ${mins % 60}m`;
}

export default function ActivityWidget({ activity, onPress }: Props) {
  const { theme } = useTheme();
  const color = CATEGORY_COLORS[activity.category] ?? '#94A3B8';
  const isUpcoming = new Date(activity.start_time) > new Date();
  const isOngoing = new Date(activity.start_time) <= new Date() && new Date(activity.end_time) >= new Date();

  const s = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 14, padding: 14, marginVertical: 4,
      borderLeftWidth: 4, borderLeftColor: color,
      borderWidth: 1, borderColor: theme.colors.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    main: { flex: 1 },
    title: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 13, color: theme.colors.textSecondary },
    badge: {
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
      backgroundColor: isOngoing ? color + '20' : theme.colors.backgroundSecondary,
    },
    badgeText: { fontSize: 12, fontWeight: '600', color: isOngoing ? color : theme.colors.textSecondary },
  });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.main}>
        <Text style={s.title} numberOfLines={1}>{activity.title}</Text>
        <View style={s.timeRow}>
          <Clock color={theme.colors.textTertiary} size={13} />
          <Text style={s.timeText}>{formatTime(activity.start_time)} — {formatTime(activity.end_time)}</Text>
        </View>
      </View>
      <View style={s.badge}>
        <Text style={s.badgeText}>{isOngoing ? 'Ongoing' : isUpcoming ? getTimeUntil(activity.start_time) : 'Done'}</Text>
      </View>
    </TouchableOpacity>
  );
}
