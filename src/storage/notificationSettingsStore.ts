import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'wenshi.notificationSettings';

export type NotificationSettings = {
  pushEnabled: boolean;
  dailyCheckIn: boolean;
  readingComplete: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: false,
  dailyCheckIn: true,
  readingComplete: true,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
};

let memorySettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return memorySettings;
    memorySettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(JSON.parse(raw) as Partial<NotificationSettings>) };
    return memorySettings;
  } catch (error) {
    console.warn('Notification settings storage unavailable, using memory settings.', error);
    return memorySettings;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  memorySettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(memorySettings));
  } catch (error) {
    console.warn('Notification settings storage unavailable, settings kept in memory only.', error);
  }
  return memorySettings;
}
