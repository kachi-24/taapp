import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Clock, MapPin, CheckCircle, Circle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity } from '@/types/activity';
import { OccurrenceDate } from '@/services/schedulingService';

interface DayEntry {
  activity: Activity;
  occurrence: OccurrenceDate;
}

interface Props {
  date: Date;
  entries: DayEntry[];
  onActivityPress?: (activity: Activity, occurrence: OccurrenceDate) => void;
  onActivityLongPress?: (activity: Activity) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  class: '#3B82F6', study: '#8B5CF6', work: '#F59E0B',
  personal: '#EC4899', health: '#10B981', social: '#F97316', other: '#94A3B8',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function getDuration(start: string, end: string): string {
  try {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } catch { return ''; }
}

export default function DayView({ date, entries, onActivityPress, onActivityLongPress }: Props) {
  const { theme } = useTheme();
  const isToday = new Date().toDateString() === date.toDateString();

  const s = StyleSheet.create({
    container: { flex: 1 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12 },
    emptySubtext: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4 },
    list: { paddingHorizontal: 16, paddingVertical: 8 },
    card: {
      borderRadius: 14,
      padding: 14,
      marginVertical: 6,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      gap: 12,
    },
    colorBar: { width: 4, borderRadius: 2 },
    content: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    actTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text, lineHeight: 20 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    timeText: { fontSize: 13, color: theme.colors.textSecondary },
    sep: { fontSize: 13, color: theme.colors.textTertiary },
    durationText: { fontSize: 12, color: theme.colors.textTertiary },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    locationText: { fontSize: 12, color: theme.colors.textTertiary },
    notesPreview: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 17 },
    completedOverlay: { opacity: 0.5 },
    recurrenceBadge: {
      alignSelf: 'flex-start', marginTop: 4,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    recurrenceText: { fontSize: 11, color: theme.colors.textTertiary },
  });

  if (entries.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyText}>{isToday ? 'No activities today' : 'No activities this day'}</Text>
        <Text style={s.emptySubtext}>Tap + to add one</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.list}>
        {entries.map(({ activity, occurrence }, idx) => {
          const color = CATEGORY_COLORS[activity.category] ?? '#94A3B8';
          return (
            <TouchableOpacity
              key={`${activity.id}-${occurrence.date}-${idx}`}
              style={[s.card, activity.is_completed && s.completedOverlay]}
              onPress={() => onActivityPress?.(activity, occurrence)}
              onLongPress={() => onActivityLongPress?.(activity)}
              activeOpacity={0.75}
            >
              <View style={[s.colorBar, { backgroundColor: color }]} />
              <View style={s.content}>
                <View style={s.titleRow}>
                  <Text style={s.actTitle} numberOfLines={2}>{activity.title}</Text>
                  <View style={[s.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.badgeText, { color }]}>
                      {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={s.timeRow}>
                  <Clock color={theme.colors.textTertiary} size={13} />
                  <Text style={s.timeText}>{formatTime(occurrence.startTime)}</Text>
                  <Text style={s.sep}>—</Text>
                  <Text style={s.timeText}>{formatTime(occurrence.endTime)}</Text>
                  <Text style={s.durationText}>({getDuration(occurrence.startTime, occurrence.endTime)})</Text>
                </View>
                {activity.location && (
                  <View style={s.locationRow}>
                    <MapPin color={theme.colors.textTertiary} size={12} />
                    <Text style={s.locationText}>{activity.location}</Text>
                  </View>
                )}
                {!!(activity.notes || activity.description) && (
                  <Text style={s.notesPreview} numberOfLines={1}>
                    {activity.notes || activity.description}
                  </Text>
                )}
                {activity.recurrence !== 'none' && (
                  <View style={s.recurrenceBadge}>
                    <Text style={s.recurrenceText}>
                      {activity.recurrence.charAt(0).toUpperCase() + activity.recurrence.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
