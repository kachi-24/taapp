import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { AlarmClock, X, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Activity } from '@/types/activity';

interface Props {
  visible: boolean;
  activity: Activity | null;
  /** Normalised volume 0–1 coming from alarmAudioService */
  volume: number;
  onDismiss: () => void;
  onSnooze: () => void;
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

const CATEGORY_COLORS: Record<string, string> = {
  class: '#3B82F6', study: '#8B5CF6', work: '#F59E0B',
  personal: '#EC4899', health: '#10B981', social: '#F97316', other: '#94A3B8',
};

const VOLUME_BARS = 8;

export default function AlarmModal({ visible, activity, volume, onDismiss, onSnooze }: Props) {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Start / stop the pulsing ring animation in sync with visibility
  useEffect(() => {
    if (visible) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseLoop.current?.stop(); };
  }, [visible]);

  if (!activity) return null;

  const color = CATEGORY_COLORS[activity.category] ?? '#94A3B8';
  const filledBars = Math.round(volume * VOLUME_BARS);

  const s = StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%', maxWidth: 380,
      backgroundColor: theme.colors.surface,
      borderRadius: 24, padding: 28, alignItems: 'center',
    },
    ringOuter: {
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: color + '20',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
    },
    ringInner: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: color,
      alignItems: 'center', justifyContent: 'center',
    },
    category: {
      fontSize: 11, fontWeight: '700', color,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: 6,
    },
    title: {
      fontSize: 22, fontWeight: '800',
      color: theme.colors.text, textAlign: 'center',
      lineHeight: 28, marginBottom: 8,
    },
    timeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginBottom: 4,
    },
    time: { fontSize: 15, color: theme.colors.textSecondary },
    notes: {
      fontSize: 13, color: theme.colors.textTertiary,
      textAlign: 'center', marginTop: 4,
      lineHeight: 18, marginBottom: 8,
    },
    volumeSection: { marginTop: 16, marginBottom: 20, alignItems: 'center' },
    volumeLabel: {
      fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    barsRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
    bar: { width: 8, borderRadius: 4 },
    snoozeBtnWrap: { width: '100%', marginBottom: 10 },
    snoozeBtn: {
      paddingVertical: 14, borderRadius: 12,
      borderWidth: 1.5, borderColor: theme.colors.border,
      alignItems: 'center',
    },
    snoozeText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    snoozeSubtext: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    dismissBtn: {
      width: '100%', paddingVertical: 14, borderRadius: 12,
      backgroundColor: theme.colors.error, alignItems: 'center',
    },
    dismissText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Pulsing icon */}
          <Animated.View style={[s.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.ringInner}>
              <AlarmClock color="#FFFFFF" size={36} />
            </View>
          </Animated.View>

          <Text style={s.category}>
            {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
          </Text>
          <Text style={s.title}>{activity.title}</Text>

          <View style={s.timeRow}>
            <Clock color={theme.colors.textSecondary} size={14} />
            <Text style={s.time}>
              {formatTime(activity.start_time)} — {formatTime(activity.end_time)}
            </Text>
          </View>

          {!!activity.notes && (
            <Text style={s.notes} numberOfLines={2}>{activity.notes}</Text>
          )}

          {/* Gradual volume indicator */}
          <View style={s.volumeSection}>
            <Text style={s.volumeLabel}>Alarm volume</Text>
            <View style={s.barsRow}>
              {Array.from({ length: VOLUME_BARS }, (_, i) => {
                const filled = i < filledBars;
                const height = 8 + i * 4;
                return (
                  <View
                    key={i}
                    style={[
                      s.bar,
                      {
                        height,
                        backgroundColor: filled ? color : theme.colors.borderLight,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Snooze */}
          <View style={s.snoozeBtnWrap}>
            <TouchableOpacity style={s.snoozeBtn} onPress={onSnooze}>
              <Text style={s.snoozeText}>Snooze</Text>
              <Text style={s.snoozeSubtext}>Remind me in 5 minutes</Text>
            </TouchableOpacity>
          </View>

          {/* Dismiss */}
          <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
            <Text style={s.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
