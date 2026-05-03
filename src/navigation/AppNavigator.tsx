import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuestionScreen } from '../screens/QuestionScreen';
import { CastScreen } from '../screens/CastScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { AIReadingScreen } from '../screens/AIReadingScreen';
import { SaveScreen } from '../screens/SaveScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ArchiveCenterScreen } from '../screens/ArchiveCenterScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { PhoneBindScreen } from '../screens/PhoneBindScreen';
import { EmailBindScreen } from '../screens/EmailBindScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { MemberCenterScreen } from '../screens/MemberCenterScreen';
import { RootStackParamList } from './types';
import { useAppTheme } from '../theme/AppTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { darkMode, colors } = useAppTheme();
  const navigationTheme = {
    ...(darkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(darkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Question" component={QuestionScreen} />
        <Stack.Screen name="Cast" component={CastScreen} options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="AIReading" component={AIReadingScreen} />
        <Stack.Screen name="Save" component={SaveScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="ArchiveCenter" component={ArchiveCenterScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="PhoneBind" component={PhoneBindScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="EmailBind" component={EmailBindScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="MemberCenter" component={MemberCenterScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
