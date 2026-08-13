export type ThemeMode = 'light' | 'dark' | 'system';

export type AccentColor = 
  | 'blue' 
  | 'green' 
  | 'orange' 
  | 'red' 
  | 'teal' 
  | 'amber';

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  divider: string;
  overlay: string;
  shadowColor: string;
  tabBarBackground: string;
  tabBarBorder: string;
  cardBackground: string;
  inputBackground: string;
  inputBorder: string;
  badge: string;
  badgeText: string;
}

export interface Typography {
  fontFamily: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface BorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
}
