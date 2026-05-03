import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'wenshi.darkMode';

type ThemeColors = {
  background: string;
  card: string;
  cardMuted: string;
  text: string;
  mutedText: string;
  faintText: string;
  divider: string;
  control: string;
  controlText: string;
  inverse: string;
  inverseText: string;
  overlay: string;
  greenSoft: string;
  redSoft: string;
  border: string;
};

type ThemeContextValue = {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => Promise<void>;
  colors: ThemeColors;
};

const lightColors: ThemeColors = {
  background: '#f3f3f3',
  card: '#ffffff',
  cardMuted: '#f5f5f5',
  text: '#111111',
  mutedText: '#666666',
  faintText: '#777777',
  divider: '#ededed',
  control: '#f0f0f0',
  controlText: '#111111',
  inverse: '#111111',
  inverseText: '#ffffff',
  overlay: 'rgba(0,0,0,0.36)',
  greenSoft: '#eaf7ee',
  redSoft: '#fff1ef',
  border: '#eeeeee',
};

const darkColors: ThemeColors = {
  background: '#0d0d0f',
  card: '#18181b',
  cardMuted: '#242428',
  text: '#f4f4f5',
  mutedText: '#b9b9c0',
  faintText: '#8e8e98',
  divider: '#2c2c31',
  control: '#27272c',
  controlText: '#f4f4f5',
  inverse: '#f4f4f5',
  inverseText: '#111111',
  overlay: 'rgba(0,0,0,0.58)',
  greenSoft: '#143222',
  redSoft: '#351b1b',
  border: '#303036',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((value) => setDarkModeState(value === 'true'))
      .catch((error) => console.warn('Theme storage unavailable, using light theme.', error));
  }, []);

  const setDarkMode = async (enabled: boolean) => {
    setDarkModeState(enabled);
    try {
      await AsyncStorage.setItem(THEME_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.warn('Theme storage unavailable, theme kept in memory only.', error);
    }
  };

  const value = useMemo(
    () => ({ darkMode, setDarkMode, colors: darkMode ? darkColors : lightColors }),
    [darkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
}
