import { Platform } from 'react-native';
import { parseVoiceInput } from './nlpParserService';
import { ParsedActivity } from '@/types/activity';

// Web Speech API types are not included in the React Native TS lib
interface WebSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface WebSpeechRecognitionEvent {
  results: { [i: number]: { [j: number]: { transcript: string; confidence: number } } };
  resultIndex: number;
}
interface WebSpeechRecognitionErrorEvent {
  error: string;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  parsed: ParsedActivity;
}

export interface VoiceRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (result: VoiceRecognitionResult) => void;
  onInterim?: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

let recognitionInstance: WebSpeechRecognition | null = null;
let silenceTimer: number | null = null;
let maxTimeout: number | null = null;
const SILENCE_TIMEOUT_MS = 5_000;   // stop after 5 s of silence
const MAX_LISTENING_MS = 30_000;     // hard cap at 30 s

function isWebSpeechSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function isSpeechRecognitionSupported(): boolean {
  return isWebSpeechSupported();
}

function clearTimers(): void {
  if (silenceTimer !== null) { window.clearTimeout(silenceTimer); silenceTimer = null; }
  if (maxTimeout !== null) { window.clearTimeout(maxTimeout); maxTimeout = null; }
}

function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Please allow microphone access in your browser settings.';
    case 'no-speech':
      return 'No speech detected. Please try speaking again.';
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'network':
      return 'Network error during speech recognition. Please check your connection.';
    case 'aborted':
      return 'Speech recognition was cancelled.';
    case 'language-not-supported':
      return 'The selected language is not supported for speech recognition.';
    default:
      return `Speech recognition error: ${code}`;
  }
}

export function startListening(
  language: string,
  callbacks: VoiceRecognitionCallbacks
): void {
  if (!isWebSpeechSupported()) {
    callbacks.onError?.('Speech recognition is not supported on this platform. Use Chrome, Edge, or Safari.');
    return;
  }

  // Abort any existing session
  abortListening();

  try {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    recognitionInstance = new SpeechRecognitionAPI() as WebSpeechRecognition;
    recognitionInstance.lang = language;
    recognitionInstance.interimResults = true;   // show partial results for better UX
    recognitionInstance.maxAlternatives = 1;
    recognitionInstance.continuous = false;

    recognitionInstance.onstart = () => {
      callbacks.onStart?.();
      // Start the max-listening timeout
      maxTimeout = window.setTimeout(() => {
        if (recognitionInstance) recognitionInstance.stop();
      }, MAX_LISTENING_MS);
    };

    recognitionInstance.onresult = (event: WebSpeechRecognitionEvent) => {
      // Reset silence timer on every result (interim or final)
      if (silenceTimer !== null) { window.clearTimeout(silenceTimer); }
      silenceTimer = window.setTimeout(() => {
        if (recognitionInstance) recognitionInstance.stop();
      }, SILENCE_TIMEOUT_MS);

      // Find the latest result
      const resultIndex = event.resultIndex;
      const result = event.results[resultIndex];
      if (result && result[0]) {
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        // Check if this is a final result (isFinal not in our type, check via confidence > 0)
        // Web Speech API: results[i].isFinal
        const isFinal = (result as any).isFinal === true || confidence > 0;

        if (isFinal) {
          const parsed = parseVoiceInput(transcript);
          callbacks.onResult?.({ transcript, confidence, parsed });
        } else {
          callbacks.onInterim?.(transcript);
        }
      }
    };

    recognitionInstance.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      clearTimers();
      callbacks.onError?.(friendlyError(event.error));
    };

    recognitionInstance.onend = () => {
      clearTimers();
      recognitionInstance = null;
      callbacks.onEnd?.();
    };

    recognitionInstance.start();
  } catch {
    callbacks.onError?.('Failed to start speech recognition. Please try again.');
  }
}

export function stopListening(): void {
  if (recognitionInstance) {
    recognitionInstance.stop();
  }
  clearTimers();
}

export function abortListening(): void {
  if (recognitionInstance) {
    try { recognitionInstance.abort(); } catch {}
    recognitionInstance = null;
  }
  clearTimers();
}
