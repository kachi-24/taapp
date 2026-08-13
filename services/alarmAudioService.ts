import { Platform } from 'react-native';
import { startAlarmSound, stopAlarmSound, stopAllAlarmSounds, setAlarmSoundVolume } from './audioService';

type VolumeCallback = (volume: number) => void;

interface ActiveAlarm {
  handleId: string;
  rampInterval: number | null;
  currentVolume: number;
  onVolumeChange?: VolumeCallback;
}

// Support multiple concurrent alarms, keyed by activity ID
const activeAlarms = new Map<string, ActiveAlarm>();

const RAMP_DURATION_MS = 30_000;   // 30 s to reach full volume
const RAMP_STEP_MS = 1_000;        // update gain every 1 s
const START_VOLUME = 0.02;
const MAX_VOLUME = 0.75;

let handleCounter = 0;

/**
 * Start a gradual alarm for the given activity.
 * Volume ramps from START_VOLUME → MAX_VOLUME over RAMP_DURATION_MS.
 * Supports multiple concurrent alarms (one per activity ID).
 *
 * @param activityId   Unique key — allows multiple alarms independently
 * @param soundId      The alarm sound ID from settings
 * @param onVolumeChange  Optional callback receiving normalised volume 0–1 every second.
 */
export function startGradualAlarm(
  activityId: string,
  soundId: string = 'default',
  onVolumeChange?: VolumeCallback
): void {
  if (Platform.OS !== 'web') return;

  // Stop any existing alarm for this activity first
  stopGradualAlarm(activityId);

  const handleId = `alarm-${handleCounter++}`;
  const soundHandle = startAlarmSound(soundId, handleId);
  if (!soundHandle) return;

  const alarm: ActiveAlarm = {
    handleId,
    rampInterval: null,
    currentVolume: START_VOLUME,
    onVolumeChange,
  };
  activeAlarms.set(activityId, alarm);

  // Volume ramp
  const totalSteps = RAMP_DURATION_MS / RAMP_STEP_MS;
  let step = 0;

  alarm.rampInterval = window.setInterval(() => {
    if (!activeAlarms.has(activityId)) return;
    step++;
    const t = step / totalSteps;
    alarm.currentVolume = START_VOLUME + (MAX_VOLUME - START_VOLUME) * Math.min(t, 1);
    setAlarmSoundVolume(handleId, alarm.currentVolume);
    alarm.onVolumeChange?.(alarm.currentVolume / MAX_VOLUME);
    if (step >= totalSteps) {
      window.clearInterval(alarm.rampInterval!);
      alarm.rampInterval = null;
    }
  }, RAMP_STEP_MS);
}

/** Stop the alarm for a specific activity. */
export function stopGradualAlarm(activityId: string): void {
  const alarm = activeAlarms.get(activityId);
  if (!alarm) return;
  if (alarm.rampInterval !== null) { window.clearInterval(alarm.rampInterval); alarm.rampInterval = null; }
  stopAlarmSound(alarm.handleId);
  activeAlarms.delete(activityId);
}

/** Stop all active alarms. */
export function stopAlarmAudio(): void {
  for (const activityId of Array.from(activeAlarms.keys())) {
    stopGradualAlarm(activityId);
  }
  stopAllAlarmSounds();
}

/** Returns the current normalised volume (0–1) for a specific alarm. */
export function getCurrentVolume(activityId: string): number {
  const alarm = activeAlarms.get(activityId);
  if (!alarm) return 0;
  return MAX_VOLUME > 0 ? alarm.currentVolume / MAX_VOLUME : 0;
}

/** Returns true if any alarm is currently playing. */
export function isAlarmActive(): boolean {
  return activeAlarms.size > 0;
}
