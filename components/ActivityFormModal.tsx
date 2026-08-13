import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useScheduleProfiles } from '@/contexts/ScheduleProfilesContext';
import { Activity, ActivityCategory, ActivityPriority, RecurrenceType } from '@/types/activity';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (activity: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  initialData?: Partial<Activity>;
  title?: string;
}

const CATEGORIES: { value: ActivityCategory; label: string; color: string }[] = [
  { value: 'class', label: 'Class', color: '#3B82F6' },
  { value: 'study', label: 'Study', color: '#8B5CF6' },
  { value: 'work', label: 'Work', color: '#F59E0B' },
  { value: 'personal', label: 'Personal', color: '#EC4899' },
  { value: 'health', label: 'Health', color: '#10B981' },
  { value: 'social', label: 'Social', color: '#F97316' },
  { value: 'other', label: 'Other', color: '#94A3B8' },
];

const PRIORITIES: { value: ActivityPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 120];
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toTimeString(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return '09:00'; }
}

function toDateString(iso: string): string {
  try { return new Date(iso).toISOString().split('T')[0]; }
  catch { return new Date().toISOString().split('T')[0]; }
}

function combineDateAndTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d.toISOString();
}

export default function ActivityFormModal({
  visible, onClose, onSave, initialData, title = 'Add Activity',
}: Props) {
  const { theme } = useTheme();
  const { profiles, activeProfile } = useScheduleProfiles();

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultStartTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:00`;
  const defaultEndTime = `${(now.getHours() + 2).toString().padStart(2, '0')}:00`;

  const [actTitle, setActTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('other');
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [location, setLocation] = useState('');
  const [profileId, setProfileId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setActTitle(initialData.title ?? '');
        setDescription(initialData.description ?? '');
        setNotes(initialData.notes ?? '');
        setCategory(initialData.category ?? 'other');
        setPriority(initialData.priority ?? 'medium');
        setDate(initialData.start_time ? toDateString(initialData.start_time) : defaultDate);
        setStartTime(initialData.start_time ? toTimeString(initialData.start_time) : defaultStartTime);
        setEndTime(initialData.end_time ? toTimeString(initialData.end_time) : defaultEndTime);
        setRecurrence(initialData.recurrence ?? 'none');
        setRecurrenceDays(initialData.recurrence_days ?? []);
        setEndDate(initialData.end_date ?? '');
        setReminderMinutes(initialData.reminder_minutes ?? 15);
        setLocation(initialData.location ?? '');
        setProfileId(initialData.profile_id ?? activeProfile?.id ?? '');
      } else {
        setActTitle('');
        setDescription('');
        setNotes('');
        setCategory('other');
        setPriority('medium');
        setDate(defaultDate);
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
        setRecurrence('none');
        setRecurrenceDays([]);
        setEndDate('');
        setReminderMinutes(15);
        setLocation('');
        setProfileId(activeProfile?.id ?? '');
      }
      setError('');
    }
  }, [visible, initialData]);

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!actTitle.trim()) { setError('Title is required'); return; }
    const startIso = combineDateAndTime(date, startTime);
    const endIso = combineDateAndTime(date, endTime);
    if (new Date(endIso) <= new Date(startIso)) { setError('End time must be after start time'); return; }
    if (endDate && recurrence !== 'none' && new Date(endDate) < new Date(date)) {
      setError('Recurrence end date must be on or after the start date'); return;
    }

    onSave({
      title: actTitle.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      priority,
      start_time: startIso,
      end_time: endIso,
      end_date: (recurrence !== 'none' && endDate.trim()) ? endDate.trim() : undefined,
      recurrence,
      recurrence_days: recurrence === 'weekly' && recurrenceDays.length > 0 ? recurrenceDays : undefined,
      reminder_minutes: reminderMinutes,
      location: location.trim() || undefined,
      is_completed: initialData?.is_completed ?? false,
      color: CATEGORIES.find(c => c.value === category)?.color,
      profile_id: profileId || undefined,
    });
    onClose();
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '95%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: theme.colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 8,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderColor: theme.colors.divider,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    closeBtn: { padding: 8, borderRadius: 20 },
    scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    sectionLabel: {
      fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary,
      marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: 10,
      padding: 12, fontSize: 15, color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground, marginBottom: 16,
    },
    row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    halfInput: {
      flex: 1, borderWidth: 1, borderColor: theme.colors.inputBorder,
      borderRadius: 10, padding: 12, backgroundColor: theme.colors.inputBackground,
    },
    halfInputLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
    halfInputText: { fontSize: 14, color: theme.colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    chipText: { fontSize: 13, fontWeight: '600' },
    dayChips: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    dayChip: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    },
    dayChipText: { fontSize: 12, fontWeight: '600' },
    reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    reminderChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    reminderText: { fontSize: 13, fontWeight: '500' },
    profileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    profileChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
    profileDot: { width: 8, height: 8, borderRadius: 4 },
    profileChipText: { fontSize: 13, fontWeight: '600' },
    error: { color: theme.colors.error, fontSize: 13, marginBottom: 12 },
    footer: {
      paddingHorizontal: 20, paddingVertical: 16,
      borderTopWidth: 1, borderColor: theme.colors.divider,
      flexDirection: 'row', gap: 12,
    },
    cancelBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary },
    saveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.headerTitle}>{title}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X color={theme.colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={s.sectionLabel}>Title *</Text>
            <TextInput
              style={s.input}
              value={actTitle}
              onChangeText={setActTitle}
              placeholder="Activity title..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Description */}
            <Text style={s.sectionLabel}>Description (optional)</Text>
            <TextInput
              style={[s.input, { height: 60, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Brief description..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Date & Time */}
            <Text style={s.sectionLabel}>Date & Time</Text>
            <View style={s.row}>
              <View style={s.halfInput}>
                <Text style={s.halfInputLabel}>DATE</Text>
                <TextInput
                  style={s.halfInputText}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={s.halfInput}>
                <Text style={s.halfInputLabel}>START</Text>
                <TextInput
                  style={s.halfInputText}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={s.halfInput}>
                <Text style={s.halfInputLabel}>END</Text>
                <TextInput
                  style={s.halfInputText}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>

            {/* Category */}
            <Text style={s.sectionLabel}>Category</Text>
            <View style={s.chips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[s.chip, {
                    borderColor: cat.color,
                    backgroundColor: category === cat.value ? cat.color : 'transparent',
                  }]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[s.chipText, { color: category === cat.value ? '#FFFFFF' : cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority */}
            <Text style={s.sectionLabel}>Priority</Text>
            <View style={s.chips}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[s.chip, {
                    borderColor: theme.colors.border,
                    backgroundColor: priority === p.value ? theme.colors.primary : 'transparent',
                  }]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={[s.chipText, { color: priority === p.value ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recurrence */}
            <Text style={s.sectionLabel}>Recurrence</Text>
            <View style={s.chips}>
              {RECURRENCES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[s.chip, {
                    borderColor: theme.colors.border,
                    backgroundColor: recurrence === r.value ? theme.colors.primary : 'transparent',
                  }]}
                  onPress={() => {
                    setRecurrence(r.value);
                    if (r.value === 'none') setEndDate('');
                  }}
                >
                  <Text style={[s.chipText, { color: recurrence === r.value ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weekly days */}
            {recurrence === 'weekly' && (
              <>
                <Text style={s.sectionLabel}>Repeat On</Text>
                <View style={s.dayChips}>
                  {DAYS_SHORT.map((day, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.dayChip, {
                        borderColor: theme.colors.border,
                        backgroundColor: recurrenceDays.includes(i) ? theme.colors.primary : 'transparent',
                      }]}
                      onPress={() => toggleDay(i)}
                    >
                      <Text style={[s.dayChipText, { color: recurrenceDays.includes(i) ? '#FFFFFF' : theme.colors.textSecondary }]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Recurrence End Date — only shown for recurring activities */}
            {recurrence !== 'none' && (
              <>
                <Text style={s.sectionLabel}>Recurrence End Date (optional)</Text>
                <TextInput
                  style={s.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD  — leave blank for no end"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </>
            )}

            {/* Reminder */}
            <Text style={s.sectionLabel}>Reminder</Text>
            <View style={s.reminderRow}>
              {REMINDER_OPTIONS.map(min => (
                <TouchableOpacity
                  key={min}
                  style={[s.reminderChip, {
                    borderColor: reminderMinutes === min ? theme.colors.primary : theme.colors.border,
                    backgroundColor: reminderMinutes === min ? theme.colors.primaryLight : 'transparent',
                  }]}
                  onPress={() => setReminderMinutes(min)}
                >
                  <Text style={[s.reminderText, { color: reminderMinutes === min ? theme.colors.primary : theme.colors.textSecondary }]}>
                    {min === 0 ? 'None' : min < 60 ? `${min}m` : `${min / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location */}
            <Text style={s.sectionLabel}>Location (optional)</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Room 101, Building A..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Notes */}
            <Text style={s.sectionLabel}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Additional notes or instructions..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Profile assignment — only shown when profiles exist */}
            {profiles.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Schedule Profile</Text>
                <View style={s.profileRow}>
                  {/* "None" option */}
                  <TouchableOpacity
                    style={[s.profileChip, {
                      borderColor: !profileId ? theme.colors.primary : theme.colors.border,
                      backgroundColor: !profileId ? theme.colors.primaryLight : 'transparent',
                    }]}
                    onPress={() => setProfileId('')}
                  >
                    <Text style={[s.profileChipText, { color: !profileId ? theme.colors.primary : theme.colors.textSecondary }]}>
                      All Profiles
                    </Text>
                  </TouchableOpacity>

                  {profiles.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.profileChip, {
                        borderColor: profileId === p.id ? p.color : theme.colors.border,
                        backgroundColor: profileId === p.id ? p.color + '20' : 'transparent',
                      }]}
                      onPress={() => setProfileId(p.id)}
                    >
                      <View style={[s.profileDot, { backgroundColor: p.color }]} />
                      <Text style={[s.profileChipText, { color: profileId === p.id ? p.color : theme.colors.textSecondary }]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveText}>Save Activity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
