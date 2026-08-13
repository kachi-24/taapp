import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, AppState } from 'react-native';
import { Plus, Mic } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useActivities } from '@/contexts/ActivityContext';
import { useAuth } from '@/contexts/AuthContext';
import { getActivitiesForDay } from '@/services/schedulingService';
import ActivityWidget from '@/components/ActivityWidget';
import ActivityFormModal from '@/components/ActivityFormModal';
import VoiceSchedulingModal from '@/components/VoiceSchedulingModal';
import { ParsedActivity } from '@/types/activity';

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const { activities, exceptions, addActivity } = useActivities();
  const { user, profile } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [greetingTick, setGreetingTick] = useState(0);

  // Refresh greeting when app comes to foreground (resume) or every minute
  const refreshGreeting = useCallback(() => setGreetingTick(t => t + 1), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshGreeting();
    });
    const interval = window.setInterval(refreshGreeting, 60_000);
    return () => {
      sub.remove();
      window.clearInterval(interval);
    };
  }, [refreshGreeting]);

  const today = new Date();
  const todayEntries = useMemo(() => getActivitiesForDay(activities, exceptions, today), [activities, exceptions]);
  const upcoming = todayEntries.filter(({ occurrence }) => new Date(occurrence.startTime) > new Date()).slice(0, 3);
  const ongoing = todayEntries.filter(({ occurrence }) =>
    new Date(occurrence.startTime) <= new Date() && new Date(occurrence.endTime) >= new Date()
  );

  // Derive first name: prefer profile full_name, fall back to email prefix
  const firstName = profile?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there';

  // greetingTick forces re-evaluation of the greeting on resume/interval
  const greeting = useMemo(() => {
    void greetingTick;
    return getGreeting(new Date().getHours());
  }, [greetingTick]);

  const handleVoiceSave = async (parsed: ParsedActivity) => {
    if (!parsed.start_time || !parsed.end_time) return;
    await addActivity({
      title: parsed.title,
      category: parsed.category ?? 'other',
      priority: parsed.priority ?? 'medium',
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      recurrence: parsed.recurrence ?? 'none',
      recurrence_days: parsed.recurrence_days,
      reminder_minutes: parsed.reminder_minutes ?? 15,
      notes: parsed.notes,
      is_completed: false,
    });
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    greeting: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 2 },
    userName: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.primary,
    },
    voiceBtn: { backgroundColor: theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.border },
    actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    voiceText: { color: theme.colors.text },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    seeAll: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    statNumber: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
    statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.greeting}>{greeting},</Text>
        <Text style={s.userName}>{firstName}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowAddModal(true)}>
            <Plus color="#FFFFFF" size={18} />
            <Text style={s.actionText}>Add Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.voiceBtn]} onPress={() => setShowVoiceModal(true)}>
            <Mic color={theme.colors.text} size={18} />
            <Text style={s.voiceText}>Voice</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{todayEntries.length}</Text>
              <Text style={s.statLabel}>Today's Activities</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{ongoing.length}</Text>
              <Text style={s.statLabel}>Ongoing Now</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNumber}>{upcoming.length}</Text>
              <Text style={s.statLabel}>Coming Up</Text>
            </View>
          </View>
        </View>

        {ongoing.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ongoing</Text>
            {ongoing.map(({ activity }) => (
              <ActivityWidget key={activity.id} activity={activity} />
            ))}
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today's Schedule</Text>
          </View>
          {todayEntries.length === 0 ? (
            <Text style={s.emptyText}>No activities today. Add one to get started!</Text>
          ) : (
            todayEntries.slice(0, 5).map(({ activity }) => (
              <ActivityWidget key={activity.id} activity={activity} />
            ))
          )}
        </View>
      </ScrollView>

      <ActivityFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => { await addActivity(data); }}
      />
      <VoiceSchedulingModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSave={handleVoiceSave}
      />
    </SafeAreaView>
  );
}
