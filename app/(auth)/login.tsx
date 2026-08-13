import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

// ── Supabase → user-friendly error strings ────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Email or password is incorrect.';
  if (msg.includes('Email not confirmed'))
    return 'Please verify your email address before signing in.';
  if (msg.includes('User already registered'))
    return 'An account with this email already exists. Try signing in.';
  if (msg.includes('Password should be at least'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('Unable to validate email address'))
    return 'Please enter a valid email address.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.';
  return msg;
}

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { theme } = useTheme();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  // ── Email + password submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) { setError('Email is required.'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const result = await resetPassword(email.trim());
        if (result.error) { setError(friendlyError(result.error.message)); }
        else { setResetSent(true); }
      } finally { setLoading(false); }
      return;
    }

    if (!password.trim()) { setError('Password is required.'); return; }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim() || undefined);
      if (result.error) {
        setError(friendlyError(result.error.message));
      } else {
        router.replace('/(tabs)');
      }
    } finally { setLoading(false); }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) setError(friendlyError(result.error.message));
      // On web, signInWithOAuth redirects the page — no further action needed here
    } finally { setGoogleLoading(false); }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logo: { alignItems: 'center', marginBottom: 40 },
    logoText: { fontSize: 32, fontWeight: '800', color: theme.colors.primary, letterSpacing: -1 },
    logoSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
    input: {
      borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: 10,
      padding: 14, fontSize: 15, color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground, marginBottom: 16,
    },
    error: { color: theme.colors.error, fontSize: 13, marginBottom: 16, textAlign: 'center' },
    success: { color: theme.colors.success, fontSize: 13, marginBottom: 16, textAlign: 'center', lineHeight: 20 },
    submitBtn: {
      backgroundColor: theme.colors.primary, borderRadius: 12, padding: 16,
      alignItems: 'center', marginBottom: 12,
    },
    submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    dividerText: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500' },
    googleBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, borderWidth: 1.5, borderColor: theme.colors.border,
      borderRadius: 12, padding: 14, marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    googleIconBox: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
    },
    googleIconText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, flexWrap: 'wrap' },
    switchText: { fontSize: 14, color: theme.colors.textSecondary },
    switchLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
    forgotLink: {
      alignSelf: 'flex-end', marginTop: -8, marginBottom: 16,
    },
    forgotLinkText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  });

  const titles: Record<Mode, string> = {
    login: 'Welcome back',
    signup: 'Create account',
    forgot: 'Reset password',
  };
  const subtitles: Record<Mode, string> = {
    login: 'Sign in to your account',
    signup: 'Start organizing your schedule',
    forgot: 'Enter your email to receive a reset link',
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoText}>ScheduleAI</Text>
          <Text style={s.logoSub}>Your intelligent schedule manager</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>{titles[mode]}</Text>
          <Text style={s.subtitle}>{subtitles[mode]}</Text>

          {/* Full name — sign-up only */}
          {mode === 'signup' && (
            <>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </>
          )}

          {/* Email */}
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* Password — login / sign-up only */}
          {mode !== 'forgot' && (
            <>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
              />
              {mode === 'login' && (
                <TouchableOpacity style={s.forgotLink} onPress={() => switchMode('forgot')}>
                  <Text style={s.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Error / success messages */}
          {error ? <Text style={s.error}>{error}</Text> : null}
          {resetSent && !error ? (
            <Text style={s.success}>
              Reset link sent! Check your inbox and follow the instructions to reset your password.
            </Text>
          ) : null}

          {/* Primary action button */}
          {!resetSent && (
            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.submitText}>
                    {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  </Text>}
            </TouchableOpacity>
          )}

          {/* Google — login / sign-up only */}
          {mode !== 'forgot' && (
            <>
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.dividerLine} />
              </View>

              <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={googleLoading}>
                {googleLoading
                  ? <ActivityIndicator color={theme.colors.text} />
                  : <>
                      <View style={s.googleIconBox}>
                        <Text style={s.googleIconText}>G</Text>
                      </View>
                      <Text style={s.googleBtnText}>Continue with Google</Text>
                    </>}
              </TouchableOpacity>
            </>
          )}

          {/* Mode switcher */}
          <View style={s.switchRow}>
            {mode === 'login' && (
              <>
                <Text style={s.switchText}>Don&apos;t have an account?</Text>
                <TouchableOpacity onPress={() => switchMode('signup')}>
                  <Text style={s.switchLink}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'signup' && (
              <>
                <Text style={s.switchText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={s.switchLink}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'forgot' && (
              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={s.switchLink}>Back to Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
