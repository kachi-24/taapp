import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, AccentColor, ColorPalette } from '@/types/theme';

const lightColors: ColorPalette = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',
  secondary: '#64748B',
  secondaryLight: '#F1F5F9',
  accent: '#0EA5E9',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  overlay: 'rgba(0,0,0,0.5)',
  shadowColor: '#000000',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  cardBackground: '#FFFFFF',
  inputBackground: '#F8FAFC',
  inputBorder: '#E2E8F0',
  badge: '#EF4444',
  badgeText: '#FFFFFF',
};

const darkColors: ColorPalette = {
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  primaryDark: '#2563EB',
  secondary: '#94A3B8',
  secondaryLight: '#1E293B',
  accent: '#38BDF8',
  success: '#22C55E',
  successLight: '#14532D',
  warning: '#F59E0B',
  warningLight: '#451A03',
  error: '#EF4444',
  errorLight: '#7F1D1D',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: '#1E293B',
  surfaceElevated: '#273549',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',
  overlay: 'rgba(0,0,0,0.7)',
  shadowColor: '#000000',
  tabBarBackground: '#1E293B',
  tabBarBorder: '#334155',
  cardBackground: '#1E293B',
  inputBackground: '#273549',
  inputBorder: '#334155',
  badge: '#EF4444',
  badgeText: '#FFFFFF',
};

const accentMap: Record<AccentColor, { primary: string; primaryLight: string; primaryDark: string; accent: string }> = {
  blue: { primary: '#2563EB', primaryLight: '#DBEAFE', primaryDark: '#1D4ED8', accent: '#0EA5E9' },
  green: { primary: '#16A34A', primaryLight: '#DCFCE7', primaryDark: '#15803D', accent: '#10B981' },
  orange: { primary: '#EA580C', primaryLight: '#FFEDD5', primaryDark: '#C2410C', accent: '#F97316' },
  red: { primary: '#DC2626', primaryLight: '#FEE2E2', primaryDark: '#B91C1C', accent: '#F43F5E' },
  teal: { primary: '#0D9488', primaryLight: '#CCFBF1', primaryDark: '#0F766E', accent: '#14B8A6' },
  amber: { primary: '#D97706', primaryLight: '#FEF3C7', primaryDark: '#B45309', accent: '#F59E0B' },
};

function buildTheme(isDark: boolean, accentColor: AccentColor): Theme {
  const base = isDark ? { ...darkColors } : { ...lightColors };
  const accent = accentMap[accentColor];
  const colors: ColorPalette = {
    ...base,
    primary: accent.primary,
    primaryLight: isDark ? accent.primaryLight.replace('#', '#1') : accent.primaryLight,
    primaryDark: accent.primaryDark,
    accent: accent.accent,
  };

  return {
    mode: isDark ? 'dark' : 'light',
    colors,
    typography: {
      fontFamily: {
        regular: 'System',
        medium: 'System',
        semibold: 'System',
        bold: 'System',
      },
      fontSize: { xs: 11, sm: 13, base: 15, lg: 17, xl: 19, '2xl': 23, '3xl': 29 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 },
    borderRadius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
    shadows: {
      sm: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.3 : 0.1, shadowRadius: 2, elevation: 2 },
      md: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.4 : 0.15, shadowRadius: 4, elevation: 4 },
      lg: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.5 : 0.2, shadowRadius: 8, elevation: 8 },
    },
  };
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: buildTheme(false, 'blue'),
  themeMode: 'system',
  accentColor: 'blue',
  setThemeMode: () => {},
  setAccentColor: () => {},
  isDark: false,
});

export function ThemeProvider({ children, themeMode: initialMode = 'system', accentColor: initialAccent = 'blue' }: {
  children: React.ReactNode;
  themeMode?: ThemeMode;
  accentColor?: AccentColor;
}) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);
  const [accentColor, setAccentColor] = useState<AccentColor>(initialAccent);

  // Sync whenever the persisted setting is loaded or changed from outside
  useEffect(() => { setThemeMode(initialMode); }, [initialMode]);
  useEffect(() => { setAccentColor(initialAccent); }, [initialAccent]);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const theme = useMemo(() => buildTheme(isDark, accentColor), [isDark, accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, accentColor, setThemeMode, setAccentColor, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
