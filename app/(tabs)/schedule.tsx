import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Mic, Layers } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useActivities } from '@/contexts/ActivityContext';
import { useScheduleProfiles } from '@/contexts/ScheduleProfilesContext';
import { getActivitiesForDay } from '@/services/schedulingService';
import DayView from '@/components/DayView';
import ActivityFormModal from '@/components/ActivityFormModal';
import VoiceSchedulingModal from '@/components/VoiceSchedulingModal';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import { ParsedActivity, Activity } from '@/types/activity';
import { OccurrenceDate } from '@/services/schedulingService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toDateStr(d: Date): string { return d.toISOString().split('T')[0]; }

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const { activities, exceptions, addActivity, updateActivity, deleteActivity } = useActivities();
  const { activeProfile } = useScheduleProfiles();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);

  // Filter activities by active profile. Activities with no profile_id are visible in all profiles.
  const displayActivities = useMemo(() => {
    if (!activeProfile) return activities;
    return activities.filter(a => !a.profile_id || a.profile_id === activeProfile.id);
  }, [activities, activeProfile]);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const dayEntries = useMemo(() =>
    getActivitiesForDay(displayActivities, exceptions, selectedDate),
    [displayActivities, exceptions, selectedDate]
  );

  const getCountForDay = (d: Date) => getActivitiesForDay(displayActivities, exceptions, d).length;

  const handleVoiceSave = async (parsed: ParsedActivity) => {
    if (!parsed.start_time || !parsed.end_time) return;
    await addActivity({
      title: parsed.title, category: parsed.category ?? 'other', priority: parsed.priority ?? 'medium',
      start_time: parsed.start_time, end_time: parsed.end_time,
      recurrence: parsed.recurrence ?? 'none', recurrence_days: parsed.recurrence_days,
      reminder_minutes: parsed.reminder_minutes ?? 15, notes: parsed.notes, is_completed: false,
      profile_id: activeProfile?.id,
    });
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    titleCol: { flex: 1 },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    profileBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3,
      alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8,
    },
    profileDot: { width: 7, height: 7, borderRadius: 4 },
    profileLabel: { fontSize: 12, fontWeight: '600' },
    headerBtns: { flexDirection: 'row', gap: 8 },
    iconBtn: {
      padding: 8, borderRadius: 10,
      backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    },
    addBtn: { padding: 8, borderRadius: 10, backgroundColor: theme.colors.primary },
    weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    weekLabel: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    navBtn: { padding: 6, borderRadius: 8 },
    weekRow: { flexDirection: 'row', gap: 6 },
    dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
    dayBtnSelected: { backgroundColor: theme.colors.primary },
    dayBtnToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
    dayName: { fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 4 },
    dayNum: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    dayNumSelected: { color: '#FFFFFF' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary },
    divider: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: 20 },
    content: { flex: 1 },
    dateLabel: { paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  });

  const monthYear = weekStart.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const todayStr = toDateStr(new Date());

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.titleCol}>
            <Text style={s.title}>Schedule</Text>
            {activeProfile && (
              <View style={[s.profileBadge, { backgroundColor: activeProfile.color + '20' }]}>
                <View style={[s.profileDot, { backgroundColor: activeProfile.color }]} />
                <Text style={[s.profileLabel, { color: activeProfile.color }]}>
                  {activeProfile.name}
                </Text>
              </View>
            )}
          </View>
          <View style={s.headerBtns}>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowVoice(true)}>
              <Mic color={theme.colors.text} size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
              <Plus color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.weekNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft color={theme.colors.textSecondary} size={20} />
          </TouchableOpacity>
          <Text style={s.weekLabel}>{monthYear}</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w + 1)}>
            <ChevronRight color={theme.colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {weekDays.map((day, i) => {
            const dateStr = toDateStr(day);
            const isSelected = toDateStr(selectedDate) === dateStr;
            const isToday = dateStr === todayStr;
            const count = getCountForDay(day);
            return (
              <TouchableOpacity
                key={i}
                style={[s.dayBtn, isSelected && s.dayBtnSelected, !isSelected && isToday && s.dayBtnToday]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[s.dayName, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                  {DAYS[day.getDay()]}
                </Text>
                <Text style={[s.dayNum, isSelected && s.dayNumSelected]}>{day.getDate()}</Text>
                {count > 0 && !isSelected && (
                  <View style={s.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <View key={j} style={s.dot} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.divider} />

      <Text style={s.dateLabel}>
        {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        {toDateStr(selectedDate) === todayStr && '  (Today)'}
      </Text>

      <View style={s.content}>
        <DayView
          date={selectedDate}
          entries={dayEntries}
          onActivityPress={(activity) => setDetailActivity(activity)}
          onActivityLongPress={(activity) => deleteActivity(activity.id)}
        />
      </View>

      {/* Add / Edit modal */}
      <ActivityFormModal
        visible={showAdd || editActivity !== null}
        title={editActivity ? 'Edit Activity' : 'Add Activity'}
        initialData={editActivity ?? undefined}
        onClose={() => { setShowAdd(false); setEditActivity(null); }}
        onSave={async (data) => {
          if (editActivity) await updateActivity(editActivity.id, data);
          else await addActivity(data);
          setEditActivity(null);
        }}
      />

      {/* Details modal */}
      <ActivityDetailsModal
        visible={detailActivity !== null}
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onEdit={(activity) => { setDetailActivity(null); setEditActivity(activity); }}
        onDelete={(id) => { deleteActivity(id); setDetailActivity(null); }}
      />

      <VoiceSchedulingModal
        visible={showVoice}
        onClose={() => setShowVoice(false)}
        onSave={handleVoiceSave}
      />
    </SafeAreaView>
  );
}
