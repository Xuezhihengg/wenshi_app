import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { QuestionScreen } from '../screens/QuestionScreen';
import { CastScreen } from '../screens/CastScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { AIReadingScreen } from '../screens/AIReadingScreen';
import { SaveScreen } from '../screens/SaveScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function TabLabel({ label }: { label: string }) {
  return (
    <View>
      <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#000' },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#777',
      }}
    >
      <Tabs.Screen
        name="Question"
        component={QuestionScreen as never}
        options={{ tabBarLabel: () => <TabLabel label="问事" /> }}
      />
      <Tabs.Screen name="Save" component={SaveScreen} options={{ tabBarLabel: () => <TabLabel label="保存" /> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: () => <TabLabel label="个人" /> }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Question" component={HomeTabs} />
        <Stack.Screen name="Cast" component={CastScreen} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} />
        <Stack.Screen name="AIReading" component={AIReadingScreen} />
        <Stack.Screen name="Save" component={SaveScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
