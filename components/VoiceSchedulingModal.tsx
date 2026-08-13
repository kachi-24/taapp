import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Animated,
  TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Mic, MicOff, X, Check, Edit3, AlertCircle, Volume2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  startListening, stopListening, abortListening,
  isSpeechRecognitionSupported, VoiceRecognitionResult,
} from '@/services/voiceRecognitionService';
import { ParsedActivity, ActivityCategory, RecurrenceType } from '@/types/activity';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (activity: ParsedActivity) => void;
}

type Phase = 'idle' | 'listening' | 'processing' | 'confirm' | 'edit';

const CATEGORY_OPTIONS: ActivityCategory[] = ['class', 'study', 'work', 'personal', 'health', 'social', 'other'];
const RECURRENCE_OPTIONS: RecurrenceType[] = ['none', 'daily', 'weekly', 'monthly'];

export default function VoiceSchedulingModal({ visible, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedActivity | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCategory, setEditedCategory] = useState<ActivityCategory>('other');
  const [editedNotes, setEditedNotes] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!visible) {
      stopAndReset();
    }
  }, [visible]);

  useEffect(() => {
    if (phase === 'listening') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  const stopAndReset = () => {
    abortListening();
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    setPhase('idle');
    setTranscript('');
    setInterimText('');
    setError(null);
    setParsed(null);
  };

  const handleClose = () => {
    stopAndReset();
    onClose();
  };

  const startVoice = () => {
    if (!supported) {
      setError('Speech recognition is not available in this browser. Try Chrome or Edge.');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimText('');
    setPhase('listening');
    startListening(settings.voice_language, {
      onStart: () => {
        setPhase('listening');
      },
      onInterim: (text: string) => {
        setInterimText(text);
      },
      onResult: (result: VoiceRecognitionResult) => {
        setTranscript(result.transcript);
        setInterimText('');
        setParsed(result.parsed);
        setEditedTitle(result.parsed.title);
        setEditedCategory(result.parsed.category ?? 'other');
        setEditedNotes(result.parsed.notes ?? '');
        setPhase('confirm');
      },
      onError: (msg: string) => {
        setError(msg);
        setPhase('idle');
      },
      onEnd: () => {
        setInterimText('');
        setPhase(prev => prev === 'listening' ? 'idle' : prev);
      },
    });
  };

  const stopVoice = () => {
    stopListening();
    setPhase('idle');
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onSave({
      ...parsed,
      title: editedTitle || parsed.title,
      category: editedCategory,
      notes: editedNotes || parsed.notes,
    });
    stopAndReset();
    onClose();
  };

  const handleEdit = () => setPhase('edit');

  const handleSaveEdit = () => {
    if (!parsed) return;
    const updated: ParsedActivity = {
      ...parsed,
      title: editedTitle,
      category: editedCategory,
      notes: editedNotes,
    };
    setParsed(updated);
    setPhase('confirm');
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return '—'; }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 20,
      maxHeight: '90%',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    closeBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.colors.backgroundSecondary },
    micWrapper: { alignItems: 'center', marginVertical: 32 },
    micRing: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    micBtn: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    hint: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 16, fontSize: 14, lineHeight: 20 },
    unsupported: {
      backgroundColor: theme.colors.warningLight, borderRadius: 12, padding: 16, marginVertical: 16,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    },
    unsupportedText: { flex: 1, color: theme.colors.warning, fontSize: 14, lineHeight: 20 },
    errorBox: {
      backgroundColor: theme.colors.errorLight, borderRadius: 12, padding: 16, marginVertical: 8,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    },
    errorText: { flex: 1, color: theme.colors.error, fontSize: 14 },
    transcriptBox: {
      backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, padding: 16, marginBottom: 16,
    },
    transcriptLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    transcriptText: { fontSize: 16, color: theme.colors.text, fontStyle: 'italic', lineHeight: 24 },
    parsedCard: { borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 16 },
    parsedRow: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderColor: theme.colors.divider },
    parsedLabel: { width: 100, fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
    parsedValue: { flex: 1, fontSize: 13, color: theme.colors.text, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: {
      flex: 1, paddingVertical: 14, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    },
    btnPrimary: { backgroundColor: theme.colors.primary },
    btnSecondary: { backgroundColor: theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.border },
    btnText: { fontSize: 15, fontWeight: '600' },
    btnPrimaryText: { color: '#FFFFFF' },
    btnSecondaryText: { color: theme.colors.text },
    input: {
      borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: 10,
      padding: 12, fontSize: 15, color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground, marginBottom: 12,
    },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipInactive: { backgroundColor: 'transparent', borderColor: theme.colors.border },
    chipText: { fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF' },
    chipTextInactive: { color: theme.colors.textSecondary },
    exampleBox: { marginTop: 8, gap: 8 },
    exampleTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4 },
    example: {
      backgroundColor: theme.colors.backgroundSecondary, borderRadius: 8, padding: 10,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    exampleText: { fontSize: 13, color: theme.colors.text, fontStyle: 'italic' },
  });

  const renderIdlePhase = () => (
    <>
      <View style={s.micWrapper}>
        <Animated.View style={[s.micRing, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity style={s.micBtn} onPress={startVoice} activeOpacity={0.8}>
            <Mic color="#FFFFFF" size={36} />
          </TouchableOpacity>
        </Animated.View>
        <Text style={s.hint}>Tap the microphone and speak your activity</Text>
      </View>

      {!supported && (
        <View style={s.unsupported}>
          <AlertCircle color={theme.colors.warning} size={20} />
          <Text style={s.unsupportedText}>
            Speech recognition requires Chrome, Edge, or Safari. Currently unavailable.
          </Text>
        </View>
      )}

      {error && (
        <View style={s.errorBox}>
          <AlertCircle color={theme.colors.error} size={18} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <View style={s.exampleBox}>
        <Text style={s.exampleTitle}>Try saying:</Text>
        {[
          '"Add Mathematics tomorrow at 8 AM"',
          '"Schedule Gym every Monday at 6 PM"',
          '"Study Physics at 7 PM tonight"',
          '"Meeting with team on Friday at 2 PM"',
        ].map((ex, i) => (
          <View key={i} style={s.example}>
            <Volume2 color={theme.colors.textTertiary} size={14} />
            <Text style={s.exampleText}>{ex}</Text>
          </View>
        ))}
      </View>
    </>
  );

  const renderListeningPhase = () => (
    <View style={s.micWrapper}>
      <Animated.View style={[s.micRing, { transform: [{ scale: pulseAnim }], backgroundColor: theme.colors.errorLight }]}>
        <TouchableOpacity style={[s.micBtn, { backgroundColor: theme.colors.error }]} onPress={stopVoice} activeOpacity={0.8}>
          <MicOff color="#FFFFFF" size={36} />
        </TouchableOpacity>
      </Animated.View>
      <Text style={[s.hint, { color: theme.colors.error }]}>Listening... tap to stop</Text>
      {interimText ? (
        <View style={[s.transcriptBox, { marginTop: 16 }]}>
          <Text style={s.transcriptLabel}>Hearing</Text>
          <Text style={[s.transcriptText, { color: theme.colors.textSecondary }]}>"{interimText}"</Text>
        </View>
      ) : null}
    </View>
  );

  const renderConfirmPhase = () => parsed && (
    <ScrollView showsVerticalScrollIndicator={false}>
      {transcript ? (
        <View style={s.transcriptBox}>
          <Text style={s.transcriptLabel}>You said</Text>
          <Text style={s.transcriptText}>"{transcript}"</Text>
        </View>
      ) : null}

      <View style={s.parsedCard}>
        {[
          { label: 'Activity', value: editedTitle || parsed.title },
          { label: 'Category', value: (editedCategory || parsed.category || 'other').charAt(0).toUpperCase() + (editedCategory || parsed.category || 'other').slice(1) },
          { label: 'Date', value: formatDate(parsed.start_time) },
          { label: 'Start', value: formatTime(parsed.start_time) },
          { label: 'End', value: formatTime(parsed.end_time) },
          { label: 'Recurrence', value: (parsed.recurrence ?? 'none').charAt(0).toUpperCase() + (parsed.recurrence ?? 'none').slice(1) },
          ...(editedNotes || parsed.notes ? [{ label: 'Notes', value: editedNotes || parsed.notes || '' }] : []),
        ].map(({ label, value }, i, arr) => (
          <View key={label} style={[s.parsedRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.parsedLabel}>{label}</Text>
            <Text style={s.parsedValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={handleEdit}>
          <Edit3 color={theme.colors.text} size={18} />
          <Text style={[s.btnText, s.btnSecondaryText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleConfirm}>
          <Check color="#FFFFFF" size={18} />
          <Text style={[s.btnText, s.btnPrimaryText]}>Save Activity</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{ alignItems: 'center', marginTop: 16, padding: 8 }}
        onPress={() => { setPhase('idle'); setTranscript(''); setParsed(null); }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Try again</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEditPhase = () => parsed && (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.label}>Activity Title *</Text>
      <TextInput
        style={s.input}
        value={editedTitle}
        onChangeText={setEditedTitle}
        placeholder="e.g. Mathematics Class"
        placeholderTextColor={theme.colors.textTertiary}
      />

      <Text style={s.label}>Category</Text>
      <View style={s.chips}>
        {CATEGORY_OPTIONS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.chip, editedCategory === cat ? s.chipActive : s.chipInactive]}
            onPress={() => setEditedCategory(cat)}
          >
            <Text style={[s.chipText, editedCategory === cat ? s.chipTextActive : s.chipTextInactive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Notes (optional)</Text>
      <TextInput
        style={[s.input, { height: 80, textAlignVertical: 'top' }]}
        value={editedNotes}
        onChangeText={setEditedNotes}
        multiline
        placeholder="Additional notes..."
        placeholderTextColor={theme.colors.textTertiary}
      />

      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => setPhase('confirm')}>
          <Text style={[s.btnText, s.btnSecondaryText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleSaveEdit}>
          <Check color="#FFFFFF" size={18} />
          <Text style={[s.btnText, s.btnPrimaryText]}>Apply</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const phaseTitle: Record<Phase, string> = {
    idle: 'Voice Scheduling',
    listening: 'Listening...',
    processing: 'Processing...',
    confirm: 'Confirm Activity',
    edit: 'Edit Details',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
          <View style={s.container}>
            <View style={s.header}>
              <Text style={s.title}>{phaseTitle[phase]}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
                <X color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            {phase === 'idle' && renderIdlePhase()}
            {phase === 'listening' && renderListeningPhase()}
            {phase === 'processing' && <ActivityIndicator color={theme.colors.primary} size="large" />}
            {phase === 'confirm' && renderConfirmPhase()}
            {phase === 'edit' && renderEditPhase()}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
