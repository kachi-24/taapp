import React from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { X, Clock, MapPin, Bell, RotateCcw, Edit3, Trash2, AlignLeft, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity } from '@/types/activity';

interface Props {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  class: '#3B82F6', study: '#8B5CF6', work: '#F59E0B',
  personal: '#EC4899', health: '#10B981', social: '#F97316', other: '#94A3B8',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return '—'; }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function getDuration(start: string, end: string): string {
  try {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } catch { return ''; }
}

export default function ActivityDetailsModal({ visible, activity, onClose, onEdit, onDelete }: Props) {
  const { theme } = useTheme();

  if (!activity) return null;

  const color = CATEGORY_COLORS[activity.category] ?? '#94A3B8';
  const priorityColors: Record<string, string> = {
    low: theme.colors.success,
    medium: theme.colors.warning,
    high: theme.colors.error,
  };
  const pColor = priorityColors[activity.priority] ?? theme.colors.textSecondary;

  const recurrenceLabel = (() => {
    if (activity.recurrence === 'none') return null;
    let label = activity.recurrence.charAt(0).toUpperCase() + activity.recurrence.slice(1);
    if (activity.recurrence === 'weekly' && activity.recurrence_days?.length) {
      label += ' on ' + activity.recurrence_days.map(d => DAY_NAMES[d]).join(', ');
    }
    if (activity.end_date) {
      label += `  ·  ends ${formatShortDate(activity.end_date)}`;
    }
    return label;
  })();

  const reminderLabel = (() => {
    if (!activity.reminder_minutes) return null;
    if (activity.reminder_minutes < 60) return `${activity.reminder_minutes} minutes before`;
    const h = activity.reminder_minutes / 60;
    return `${h} hour${h > 1 ? 's' : ''} before`;
  })();

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '92%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    header: { paddingHorizontal: 20, paddingVertical: 16 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    categoryBadge: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
      backgroundColor: color + '20',
    },
    categoryText: {
      fontSize: 12, fontWeight: '700', color,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    closeBtn: {
      padding: 8, borderRadius: 20,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    title: {
      fontSize: 22, fontWeight: '800',
      color: theme.colors.text, lineHeight: 28, marginBottom: 8,
    },
    priorityBadge: {
      alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 6, borderWidth: 1,
      borderColor: pColor + '40', backgroundColor: pColor + '10',
    },
    priorityText: { fontSize: 12, fontWeight: '600', color: pColor },
    divider: { height: 1, backgroundColor: theme.colors.divider },
    scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    iconBox: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    infoContent: { flex: 1, paddingTop: 2 },
    infoLabel: {
      fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
    },
    infoValue: { fontSize: 15, color: theme.colors.text, fontWeight: '500', lineHeight: 22 },
    infoSub: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginTop: 1 },
    notesBox: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12, padding: 14, marginBottom: 16,
    },
    notesLabel: {
      fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
    },
    notesText: { fontSize: 14, color: theme.colors.text, lineHeight: 22 },
    footer: {
      paddingHorizontal: 20, paddingVertical: 16,
      borderTopWidth: 1, borderColor: theme.colors.divider,
      flexDirection: 'row', gap: 12,
    },
    editBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.primary,
    },
    editText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    deleteBtn: {
      paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12,
      backgroundColor: theme.colors.errorLight,
      alignItems: 'center', justifyContent: 'center',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.handle} />

          <View style={s.header}>
            <View style={s.topRow}>
              <View style={s.categoryBadge}>
                <Text style={s.categoryText}>
                  {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <X color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            <Text style={s.title}>{activity.title}</Text>
            <View style={s.priorityBadge}>
              <Text style={s.priorityText}>
                {activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1)} Priority
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Date & Time */}
            <View style={s.infoRow}>
              <View style={s.iconBox}>
                <Clock color={theme.colors.primary} size={18} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Date & Time</Text>
                <Text style={s.infoValue}>{formatDate(activity.start_time)}</Text>
                <Text style={s.infoSub}>
                  {formatTime(activity.start_time)} — {formatTime(activity.end_time)}
                  {'  '}({getDuration(activity.start_time, activity.end_time)})
                </Text>
              </View>
            </View>

            {/* Recurrence */}
            {recurrenceLabel && (
              <View style={s.infoRow}>
                <View style={s.iconBox}>
                  <RotateCcw color={theme.colors.primary} size={18} />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Repeats</Text>
                  <Text style={s.infoValue}>{recurrenceLabel}</Text>
                </View>
              </View>
            )}

            {/* Location */}
            {!!activity.location && (
              <View style={s.infoRow}>
                <View style={s.iconBox}>
                  <MapPin color={theme.colors.primary} size={18} />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Location</Text>
                  <Text style={s.infoValue}>{activity.location}</Text>
                </View>
              </View>
            )}

            {/* Reminder */}
            {!!reminderLabel && (
              <View style={s.infoRow}>
                <View style={s.iconBox}>
                  <Bell color={theme.colors.primary} size={18} />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoLabel}>Reminder</Text>
                  <Text style={s.infoValue}>{reminderLabel}</Text>
                </View>
              </View>
            )}

            {/* Description */}
            {!!activity.description && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Description</Text>
                <Text style={s.notesText}>{activity.description}</Text>
              </View>
            )}

            {/* Notes / Additional Instructions */}
            {!!activity.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Notes</Text>
                <Text style={s.notesText}>{activity.notes}</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => { onClose(); onEdit(activity); }}
            >
              <Edit3 color="#FFFFFF" size={18} />
              <Text style={s.editText}>Edit Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => { onDelete(activity.id); onClose(); }}
            >
              <Trash2 color={theme.colors.error} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
