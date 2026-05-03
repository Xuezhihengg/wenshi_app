import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppThemeProvider, useAppTheme } from './src/theme/AppTheme';
import { AppLanguageProvider } from './src/i18n/AppLanguage';

function AppContent() {
  const { darkMode } = useAppTheme();
  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AppLanguageProvider>
        <AppContent />
      </AppLanguageProvider>
    </AppThemeProvider>
  );
}
