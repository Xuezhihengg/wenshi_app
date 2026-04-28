import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuestionScreen } from '../screens/QuestionScreen';
import { CastScreen } from '../screens/CastScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { AIReadingScreen } from '../screens/AIReadingScreen';
import { SaveScreen } from '../screens/SaveScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer theme={DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Question" component={QuestionScreen} />
        <Stack.Screen name="Cast" component={CastScreen} options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ animation: 'fade', gestureEnabled: false, headerBackButtonMenuEnabled: false }} />
        <Stack.Screen name="AIReading" component={AIReadingScreen} />
        <Stack.Screen name="Save" component={SaveScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
