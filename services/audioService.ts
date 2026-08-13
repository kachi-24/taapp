import { Platform } from 'react-native';

// ─── Sound definitions ───────────────────────────────────────────────────────
// Each sound is a distinct waveform + frequency pattern. No external audio
// files needed — generated via Web Audio API so there are zero missing assets.

export interface SoundDef {
  id: string;
  label: string;
  frequencies: number[];     // Hz values to cycle through
  waveform: OscillatorType;
  intervalMs: number;        // gap between beeps
  durationMs: number;        // length of each beep
}

export const NOTIFICATION_SOUNDS: SoundDef[] = [
  { id: 'default',  label: 'Default',   frequencies: [880],            waveform: 'sine',     intervalMs: 350, durationMs: 150 },
  { id: 'chime',   label: 'Chime',      frequencies: [880, 1320],      waveform: 'sine',     intervalMs: 300, durationMs: 200 },
  { id: 'ding',    label: 'Ding',       frequencies: [1047],           waveform: 'triangle', intervalMs: 400, durationMs: 180 },
  { id: 'pulse',   label: 'Pulse',      frequencies: [660, 660, 660],  waveform: 'square',   intervalMs: 200, durationMs: 80  },
  { id: 'alert',   label: 'Alert',      frequencies: [1200, 800],      waveform: 'sawtooth', intervalMs: 250, durationMs: 120 },
];

export const ALARM_SOUNDS: SoundDef[] = [
  { id: 'default',     label: 'Classic',    frequencies: [880, 1100],       waveform: 'sine',     intervalMs: 700,  durationMs: 250 },
  { id: 'ascending',   label: 'Ascending',   frequencies: [440, 554, 659, 880], waveform: 'sine',  intervalMs: 500,  durationMs: 200 },
  { id: 'pulse',       label: 'Pulse',        frequencies: [1000, 1000],      waveform: 'square',   intervalMs: 400,  durationMs: 100 },
  { id: 'radar',       label: 'Radar',       frequencies: [1200, 800, 1200], waveform: 'triangle', intervalMs: 600,  durationMs: 180 },
  { id: 'digital',     label: 'Digital',      frequencies: [988, 1319],      waveform: 'sawtooth', intervalMs: 550,  durationMs: 150 },
];

export function getNotificationSound(id: string): SoundDef {
  return NOTIFICATION_SOUNDS.find(s => s.id === id) ?? NOTIFICATION_SOUNDS[0];
}

export function getAlarmSound(id: string): SoundDef {
  return ALARM_SOUNDS.find(s => s.id === id) ?? ALARM_SOUNDS[0];
}

// ─── Audio playback ───────────────────────────────────────────────────────────

let playCtx: AudioContext | null = null;

function getPlayContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  if (!playCtx) {
    try { playCtx = new AudioContext(); }
    catch { return null; }
  }
  if (playCtx.state === 'suspended') playCtx.resume().catch(() => {});
  return playCtx;
}

/**
 * Play a one-shot notification sound (short sequence of beeps).
 * Used when a reminder notification fires.
 */
export function playNotificationSound(soundId: string): void {
  if (Platform.OS !== 'web') return;
  const ctx = getPlayContext();
  if (!ctx) return;
  const sound = getNotificationSound(soundId);

  const master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  sound.frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = sound.waveform;
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(master);
    const startAt = ctx.currentTime + (i * sound.intervalMs) / 1000;
    const dur = sound.durationMs / 1000;
    env.gain.setValueAtTime(0, startAt);
    env.gain.linearRampToValueAtTime(1, startAt + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);
  });
}

/**
 * Start a looping alarm sound that continues until stopAlarmSound() is called.
 * Returns an opaque handle.
 */
export interface AlarmSoundHandle {
  ctx: AudioContext;
  master: GainNode;
  intervalId: number;
  phase: number;
  sound: SoundDef;
}

const activeAlarmSounds = new Map<string, AlarmSoundHandle>();

export function startAlarmSound(soundId: string, handleId: string): AlarmSoundHandle | null {
  if (Platform.OS !== 'web') return null;
  const ctx = getPlayContext();
  if (!ctx) return null;
  const sound = getAlarmSound(soundId);

  // Stop any existing sound with this handle
  stopAlarmSound(handleId);

  const master = ctx.createGain();
  master.gain.value = 0.02; // starts quiet, ramp handled by alarmAudioService
  master.connect(ctx.destination);

  let phase = 0;
  const playBeep = () => {
    const freq = sound.frequencies[phase % sound.frequencies.length];
    phase++;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = sound.waveform;
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(master);
    const now = ctx.currentTime;
    const dur = sound.durationMs / 1000;
    env.gain.setValueAtTime(1, now);
    env.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  };

  // Play first beep immediately
  playBeep();
  const intervalId = window.setInterval(playBeep, sound.intervalMs);

  const handle: AlarmSoundHandle = { ctx, master, intervalId, phase, sound };
  activeAlarmSounds.set(handleId, handle);
  return handle;
}

export function stopAlarmSound(handleId: string): void {
  const handle = activeAlarmSounds.get(handleId);
  if (!handle) return;
  window.clearInterval(handle.intervalId);
  try { handle.master.disconnect(); } catch {}
  activeAlarmSounds.delete(handleId);
}

export function stopAllAlarmSounds(): void {
  for (const id of Array.from(activeAlarmSounds.keys())) {
    stopAlarmSound(id);
  }
}

export function setAlarmSoundVolume(handleId: string, volume: number): void {
  const handle = activeAlarmSounds.get(handleId);
  if (handle) handle.master.gain.value = volume;
}

// ─── Text-to-Speech (Web Speech Synthesis API) ───────────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isTTSSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface TTSOptions {
  language?: string;
  rate?: number;    // 0.1 – 10, default 1
  pitch?: number;   // 0 – 2, default 1
  volume?: number;  // 0 – 1, default 1
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export function speak(text: string, options: TTSOptions = {}): void {
  if (Platform.OS !== 'web') return;
  if (!isTTSSupported()) { options.onError?.('Text-to-speech not supported.'); return; }
  if (!text.trim()) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = options.language ?? 'en-US';
  utter.rate = options.rate ?? 1;
  utter.pitch = options.pitch ?? 1;
  utter.volume = options.volume ?? 1;

  utter.onend = () => { currentUtterance = null; options.onEnd?.(); };
  utter.onerror = (e) => { currentUtterance = null; options.onError?.(e.error); };

  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (Platform.OS !== 'web') return;
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (Platform.OS !== 'web') return false;
  if (!isTTSSupported()) return false;
  return window.speechSynthesis.speaking;
}

/** Returns available voices for a given language code (BCP-47). */
export function getVoicesForLanguage(lang: string): SpeechSynthesisVoice[] {
  if (Platform.OS !== 'web') return [];
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith(lang.split('-')[0]));
}
