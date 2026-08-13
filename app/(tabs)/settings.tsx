import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Moon, Sun, Monitor, Check, HardDriveDownload, Volume2, Play } from 'lucide-react-native';
import { ThemeMode, AccentColor } from '@/types/theme';
import ScheduleProfilesManager from '@/components/ScheduleProfilesManager';
import BackupRestoreModal from '@/components/BackupRestoreModal';
import { NOTIFICATION_SOUNDS, ALARM_SOUNDS, playNotificationSound, speak, stopSpeaking, isTTSSupported } from '@/services/audioService';

const ACCENT_COLORS: { value: AccentColor; color: string }[] = [
  { value: 'blue', color: '#2563EB' },
  { value: 'green', color: '#16A34A' },
  { value: 'orange', color: '#EA580C' },
  { value: 'red', color: '#DC2626' },
  { value: 'teal', color: '#0D9488' },
  { value: 'amber', color: '#D97706' },
];

const REMINDER_OPTIONS = [5, 10, 15, 30, 60];

const VOICE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
];

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [showBackup, setShowBackup] = useState(false);

  const handleTestNotificationSound = (soundId: string) => {
    playNotificationSound(soundId);
  };

  const handleTestTTS = () => {
    if (!isTTSSupported()) return;
    stopSpeaking();
    speak(`Hello! This is a test of text to speech in ${settings.voice_language}.`, {
      language: settings.voice_language,
      rate: 1,
      pitch: 1,
    });
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    scroll: { flex: 1 },
    section: { marginHorizontal: 16, marginBottom: 24 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, paddingHorizontal: 4 },
    card: { backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: theme.colors.divider, gap: 10 },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    rowValue: { fontSize: 14, color: theme.colors.textSecondary },
    themeRow: { flexDirection: 'row', gap: 8, padding: 12 },
    themeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
    themeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    themeBtnInactive: { borderColor: theme.colors.border, backgroundColor: 'transparent' },
    themeBtnText: { fontSize: 13, fontWeight: '600' },
    accentRow: { flexDirection: 'row', gap: 10, padding: 14, flexWrap: 'wrap' },
    accentDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    reminderChips: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    chipText: { fontSize: 13, fontWeight: '500' },
    langList: { padding: 4 },
    langItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderRadius: 8 },
    langText: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    soundRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: theme.colors.divider, gap: 10 },
    soundLabel: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    playBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.colors.primaryLight },
    ttsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.primary, marginTop: 8 },
    ttsBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionLabel}>Appearance</Text>
          <View style={s.card}>
            <View style={s.themeRow}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[s.themeBtn, settings.theme_mode === mode ? s.themeBtnActive : s.themeBtnInactive]}
                  onPress={() => updateSettings({ theme_mode: mode })}
                >
                  {mode === 'light' ? <Sun color={settings.theme_mode === mode ? '#FFF' : theme.colors.text} size={14} /> :
                   mode === 'dark' ? <Moon color={settings.theme_mode === mode ? '#FFF' : theme.colors.text} size={14} /> :
                   <Monitor color={settings.theme_mode === mode ? '#FFF' : theme.colors.text} size={14} />}
                  <Text style={[s.themeBtnText, { color: settings.theme_mode === mode ? '#FFF' : theme.colors.text }]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Accent Color</Text>
          <View style={s.card}>
            <View style={s.accentRow}>
              {ACCENT_COLORS.map(({ value, color }) => (
                <TouchableOpacity
                  key={value}
                  style={[s.accentDot, { backgroundColor: color, borderWidth: settings.accent_color === value ? 3 : 0, borderColor: theme.colors.text }]}
                  onPress={() => updateSettings({ accent_color: value })}
                >
                  {settings.accent_color === value && <Check color="#FFFFFF" size={16} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Default Reminder</Text>
          <View style={s.card}>
            <View style={s.reminderChips}>
              {REMINDER_OPTIONS.map(min => (
                <TouchableOpacity
                  key={min}
                  style={[s.chip, { borderColor: settings.reminder_minutes === min ? theme.colors.primary : theme.colors.border, backgroundColor: settings.reminder_minutes === min ? theme.colors.primaryLight : 'transparent' }]}
                  onPress={() => updateSettings({ reminder_minutes: min })}
                >
                  <Text style={[s.chipText, { color: settings.reminder_minutes === min ? theme.colors.primary : theme.colors.textSecondary }]}>
                    {min < 60 ? `${min} min` : `${min / 60} hr`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Notification Sound */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Notification Sound</Text>
          <View style={s.card}>
            {NOTIFICATION_SOUNDS.map((sound, i) => (
              <View key={sound.id} style={[s.soundRow, i === NOTIFICATION_SOUNDS.length - 1 && s.rowLast]}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  onPress={() => updateSettings({ notification_sound: sound.id })}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: settings.notification_sound === sound.id ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    {settings.notification_sound === sound.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />}
                  </View>
                  <Text style={s.soundLabel}>{sound.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.playBtn} onPress={() => handleTestNotificationSound(sound.id)}>
                  <Play color={theme.colors.primary} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Alarm Sound */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Alarm Sound</Text>
          <View style={s.card}>
            {ALARM_SOUNDS.map((sound, i) => (
              <View key={sound.id} style={[s.soundRow, i === ALARM_SOUNDS.length - 1 && s.rowLast]}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  onPress={() => updateSettings({ alarm_sound: sound.id })}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: settings.alarm_sound === sound.id ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    {settings.alarm_sound === sound.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />}
                  </View>
                  <Text style={s.soundLabel}>{sound.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.playBtn} onPress={() => handleTestNotificationSound(sound.id)}>
                  <Play color={theme.colors.primary} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Voice Language */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Voice Language</Text>
          <View style={s.card}>
            <View style={s.langList}>
              {VOICE_LANGUAGES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[s.langItem, settings.voice_language === value && { backgroundColor: theme.colors.primaryLight }]}
                  onPress={() => updateSettings({ voice_language: value })}
                >
                  <Text style={[s.langText, settings.voice_language === value && { color: theme.colors.primary, fontWeight: '700' }]}>
                    {label}
                  </Text>
                  {settings.voice_language === value && <Check color={theme.colors.primary} size={16} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Text-to-Speech */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Text-to-Speech</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <Volume2 color={theme.colors.textSecondary} size={20} />
              <Text style={s.rowLabel}>Test Voice</Text>
              <Text style={s.rowValue}>{isTTSSupported() ? 'Tap to test' : 'Unsupported'}</Text>
            </View>
          </View>
          {isTTSSupported() && (
            <TouchableOpacity style={s.ttsBtn} onPress={handleTestTTS}>
              <Play color="#FFFFFF" size={18} />
              <Text style={s.ttsBtnText}>Test Text-to-Speech</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Schedule Profiles */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Schedule Profiles</Text>
          <ScheduleProfilesManager />
        </View>

        {/* Backup & Restore */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Data</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={() => setShowBackup(true)}
            >
              <HardDriveDownload color={theme.colors.primary} size={20} />
              <Text style={s.rowLabel}>Backup & Restore</Text>
              <Text style={s.rowValue}>Export / Import</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <BackupRestoreModal
        visible={showBackup}
        onClose={() => setShowBackup(false)}
      />
    </SafeAreaView>
  );
}
