import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getCurrentUser, hasStoredLogin, isGuestMode } from '../api/client';
import { getUserProfile, DEFAULT_USER_PROFILE } from '../storage/userProfileStore';
import { QuestionScreen } from '../screens/QuestionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
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
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { MemberCenterScreen } from '../screens/MemberCenterScreen';
import { RootStackParamList } from './types';
import { useAppTheme } from '../theme/AppTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { darkMode, colors } = useAppTheme();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | undefined>();
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

  useEffect(() => {
    (async () => {
      try {
        if (await isGuestMode()) {
          const profile = await getUserProfile();
          const completed = profile.nickname.trim() !== DEFAULT_USER_PROFILE.nickname && profile.birthday.trim() !== DEFAULT_USER_PROFILE.birthday;
          setInitialRoute(completed ? 'Question' : 'ProfileSetup');
          return;
        }
        const loggedIn = await hasStoredLogin();
        if (!loggedIn) {
          setInitialRoute('Login');
          return;
        }
        const user = await getCurrentUser();
        setInitialRoute(user.profile_completed ? 'Question' : 'ProfileSetup');
      } catch {
        setInitialRoute('Login');
      }
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Question" component={QuestionScreen} options={{ animation: 'fade', gestureEnabled: false }} />
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
        <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="MemberCenter" component={MemberCenterScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
