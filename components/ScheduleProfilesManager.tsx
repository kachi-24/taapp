import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { Plus, Check, Edit3, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useScheduleProfiles, ScheduleProfile } from '@/contexts/ScheduleProfilesContext';
import { useActivities } from '@/contexts/ActivityContext';
import { cancelAllReminders, scheduleActivityReminder } from '@/services/notificationService';
import { useSettings } from '@/contexts/SettingsContext';

const PROFILE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#0D9488', '#F97316',
];

interface FormData {
  name: string;
  description: string;
  color: string;
}

export default function ScheduleProfilesManager() {
  const { theme } = useTheme();
  const {
    profiles, activeProfile,
    addProfile, updateProfile, deleteProfile, setActiveProfile,
  } = useScheduleProfiles();
  const { activities } = useActivities();
  const { settings } = useSettings();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', description: '', color: PROFILE_COLORS[0] });
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', color: PROFILE_COLORS[0] });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (p: ScheduleProfile) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description ?? '', color: p.color });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Profile name is required'); return; }
    if (editingId) {
      await updateProfile(editingId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
      });
    } else {
      await addProfile({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        is_active: false,
      });
    }
    setShowForm(false);
  };

  const handleActivate = async (profile: ScheduleProfile) => {
    if (profile.is_active) return;
    await setActiveProfile(profile.id);
    triggerReschedule(profile.id);
  };

  const handleDeactivateAll = async () => {
    if (!activeProfile) return;
    await updateProfile(activeProfile.id, { is_active: false });
    triggerReschedule(null);
  };

  const handleDelete = async (profile: ScheduleProfile) => {
    const wasActive = profile.is_active;
    await deleteProfile(profile.id);
    if (wasActive) triggerReschedule(null);
  };

  const triggerReschedule = (profileId: string | null) => {
    cancelAllReminders();
    const now = new Date();
    const filtered = profileId
      ? activities.filter(a => !a.profile_id || a.profile_id === profileId)
      : activities;
    filtered.forEach(activity => {
      if (activity.reminder_minutes > 0 && new Date(activity.start_time) > now) {
        scheduleActivityReminder(activity, activity.reminder_minutes, settings.notification_sound, settings.voice_language);
      }
    });
  };

  const s = StyleSheet.create({
    defaultCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 8,
    },
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 8,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
    info: { flex: 1 },
    profileName: { fontSize: 15, fontWeight: '700' },
    profileDesc: { fontSize: 12, marginTop: 1 },
    checkCircle: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    actions: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 6, borderRadius: 8 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
      borderStyle: 'dashed', borderColor: theme.colors.border, marginTop: 4,
    },
    addText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    // Form
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    formSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40,
    },
    formHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 20,
    },
    formTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    closeBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.colors.backgroundSecondary },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
    input: {
      borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: 10,
      padding: 12, fontSize: 15, color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground, marginBottom: 16,
    },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    colorDotLg: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    formError: { color: theme.colors.error, fontSize: 13, marginBottom: 12 },
    formBtns: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 12,
      alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary,
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    saveBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 12,
      alignItems: 'center', backgroundColor: theme.colors.primary,
    },
    saveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  });

  return (
    <View>
      {/* "All Activities" default option */}
      <TouchableOpacity
        style={[s.defaultCard, {
          borderColor: !activeProfile ? theme.colors.primary : theme.colors.border,
          backgroundColor: !activeProfile ? theme.colors.primaryLight : theme.colors.surface,
        }]}
        onPress={handleDeactivateAll}
      >
        <View style={[s.colorDot, { backgroundColor: theme.colors.textTertiary }]} />
        <View style={s.info}>
          <Text style={[s.profileName, { color: !activeProfile ? theme.colors.primary : theme.colors.text }]}>
            All Activities
          </Text>
          <Text style={[s.profileDesc, { color: theme.colors.textSecondary }]}>Default — show everything</Text>
        </View>
        {!activeProfile && (
          <View style={[s.checkCircle, { backgroundColor: theme.colors.primary }]}>
            <Check color="#FFFFFF" size={14} />
          </View>
        )}
      </TouchableOpacity>

      {/* Profile list */}
      {profiles.map(profile => (
        <TouchableOpacity
          key={profile.id}
          style={[s.profileCard, {
            borderColor: profile.is_active ? profile.color : theme.colors.border,
            backgroundColor: profile.is_active ? profile.color + '18' : theme.colors.surface,
          }]}
          onPress={() => handleActivate(profile)}
        >
          <View style={[s.colorDot, { backgroundColor: profile.color }]} />
          <View style={s.info}>
            <Text style={[s.profileName, { color: profile.is_active ? profile.color : theme.colors.text }]}>
              {profile.name}
            </Text>
            {!!profile.description && (
              <Text style={[s.profileDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {profile.description}
              </Text>
            )}
          </View>
          {profile.is_active && (
            <View style={[s.checkCircle, { backgroundColor: profile.color }]}>
              <Check color="#FFFFFF" size={14} />
            </View>
          )}
          <View style={s.actions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(profile)}>
              <Edit3 color={theme.colors.textSecondary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(profile)}>
              <Trash2 color={theme.colors.error} size={16} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.addBtn} onPress={openCreate}>
        <Plus color={theme.colors.textSecondary} size={16} />
        <Text style={s.addText}>New Profile</Text>
      </TouchableOpacity>

      {/* Create / Edit Form */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={s.formSheet}>
            <View style={s.formHeader}>
              <Text style={s.formTitle}>{editingId ? 'Edit Profile' : 'New Profile'}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowForm(false)}>
                <X color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Profile Name *</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. School, Holiday, Exams..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={s.label}>Description (optional)</Text>
            <TextInput
              style={s.input}
              value={form.description}
              onChangeText={v => setForm(p => ({ ...p, description: v }))}
              placeholder="Brief description..."
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={s.label}>Color</Text>
            <View style={s.colorRow}>
              {PROFILE_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    s.colorDotLg,
                    { backgroundColor: c },
                    form.color === c && { borderWidth: 3, borderColor: theme.colors.text },
                  ]}
                  onPress={() => setForm(p => ({ ...p, color: c }))}
                >
                  {form.color === c && <Check color="#FFFFFF" size={16} />}
                </TouchableOpacity>
              ))}
            </View>

            {formError ? <Text style={s.formError}>{formError}</Text> : null}

            <View style={s.formBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveText}>{editingId ? 'Save Changes' : 'Create Profile'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
