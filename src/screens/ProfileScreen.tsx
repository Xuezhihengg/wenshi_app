import { useCallback, useEffect, useRef, useState } from 'react';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Animated, AppState, Easing, Image, Linking, Modal, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clearStoredLogin, disableGuestMode, isGuestMode } from '../api/client';
import { alertGuestRequiresLogin } from '../utils/guestPrompt';
import { AppMoreMenu } from '../components/AppMoreMenu';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { DivinationProfile } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { addProfile, listProfiles, profileInitial } from '../storage/profileStore';
import { listRecords } from '../storage/recordStore';
import { clearLocalUserProfile, getUserProfile, syncUserProfileFromSelfArchive, UserProfile } from '../storage/userProfileStore';
import { DEFAULT_NOTIFICATION_SETTINGS, getNotificationSettings, NotificationSettings, saveNotificationSettings } from '../storage/notificationSettingsStore';
import { useAppTheme } from '../theme/AppTheme';
import { AppLanguage, TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;
type LayoutBox = { x: number; y: number; width: number; height: number };
type ProfileStats = { castCount: number; fulfilledCount: number };
type ProfileScreenCache = {
  profiles: DivinationProfile[];
  userProfile?: UserProfile;
  profileStats: ProfileStats;
  guestMode: boolean;
};

type NotificationPermissionResponse = {
  granted?: boolean;
  ios?: { status?: number };
};

type NotificationsModule = {
  IosAuthorizationStatus?: { PROVISIONAL?: number };
  getPermissionsAsync: () => Promise<NotificationPermissionResponse>;
  requestPermissionsAsync: () => Promise<NotificationPermissionResponse>;
};

function getNotificationsModule(): NotificationsModule | undefined {
  return undefined;
}

function latestRecordFulfilled(record: { verificationNotes?: Array<{ fulfilled: boolean; createdAt: string }> }) {
  const latestNote = [...(record.verificationNotes ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return Boolean(latestNote?.fulfilled);
}

function notificationGranted(permissions: NotificationPermissionResponse, notifications?: NotificationsModule) {
  return Boolean(
    permissions.granted
    || (
      notifications?.IosAuthorizationStatus?.PROVISIONAL !== undefined
      && permissions.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
    )
  );
}

type MenuItem = { key: string; icon: LineIconName; labelKey: TranslationKey };

const SETTING_ITEMS: MenuItem[] = [
  { key: 'notifications', icon: 'bell', labelKey: 'profile.notifications' },
  { key: 'darkMode', icon: 'moon', labelKey: 'profile.darkMode' },
  { key: 'language', icon: 'language', labelKey: 'profile.language' },
  { key: 'feedback', icon: 'message', labelKey: 'profile.feedback' },
  { key: 'about', icon: 'info', labelKey: 'profile.about' },
];
const QUIET_TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => `${index.toString().padStart(2, '0')}:00`);
const TIME_WHEEL_ITEM_HEIGHT = 36;
const TIME_WHEEL_VISIBLE_ITEMS = 5;
const TIME_WHEEL_SIDE_PADDING = TIME_WHEEL_ITEM_HEIGHT * 2;
let profileScreenCache: ProfileScreenCache | undefined;

function timeToHour(time: string) {
  return Number.parseInt(time.slice(0, 2), 10);
}

function allowedQuietTimes(kind: 'start' | 'end', start: string, end: string) {
  const startHour = timeToHour(start);
  const endHour = timeToHour(end);
  return QUIET_TIME_OPTIONS.filter((time) => {
    const hour = timeToHour(time);
    return kind === 'start' ? hour <= endHour : hour >= startHour;
  });
}

function ProfileInitialAvatar({ profile }: { profile: DivinationProfile }) {
  const { darkMode } = useAppTheme();
  return (
    <View style={[styles.profileInitialAvatar, { backgroundColor: darkMode ? '#2a2a2f' : '#ffffff' }]}>
      {profile.avatarUri ? (
        <Image source={{ uri: profile.avatarUri }} style={styles.profileInitialImage} />
      ) : (
        <Text style={[styles.profileInitialText, { color: darkMode ? '#fff' : '#111' }]}>{profileInitial(profile.name)}</Text>
      )}
    </View>
  );
}

function ProfileArchiveRow({
  profiles,
  onSelect,
  onAdd,
}: {
  profiles: DivinationProfile[];
  onSelect: (profile: DivinationProfile) => void;
  onAdd: () => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  return (
    <View style={styles.archiveSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.archiveContent}
      >
        {profiles.map((profile) => (
          <Pressable key={profile.id} style={styles.archiveItem} onPress={() => onSelect(profile)}>
            <ProfileInitialAvatar profile={profile} />
            <Text numberOfLines={1} style={[styles.archiveName, { color: colors.text }]}>{profile.name}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.archiveItem} onPress={onAdd}>
          <View style={[styles.addArchiveAvatar, { backgroundColor: colors.inverse }]}>
            <Text style={[styles.addArchiveText, { color: colors.inverseText }]}>＋</Text>
          </View>
          <Text numberOfLines={1} style={[styles.archiveName, { color: colors.text }]}>{t('question.profileAdd')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function QuickEntryCard({
  icon,
  title,
  subtitle,
  accent,
  onPress,
}: {
  icon: LineIconName;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable style={[styles.quickEntryCard, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={[styles.quickEntryIcon, { backgroundColor: accent }]}>
        <LineIcon name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.quickEntryTextWrap}>
        <Text style={[styles.quickEntryTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.quickEntrySubtitle, { color: colors.mutedText }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.quickEntryArrow, { color: colors.faintText }]}>›</Text>
    </Pressable>
  );
}

function MenuCard({
  title,
  items,
  onItemPress,
  rightAccessory,
}: {
  title: string;
  items: MenuItem[];
  onItemPress?: (key: string) => void;
  rightAccessory?: (key: string) => React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  return (
    <View style={[styles.smallCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.smallCardTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.optionList, { backgroundColor: colors.card }]}>
        {items.map((item, index) => (
          <View key={item.key}>
            <Pressable style={styles.optionRow} onPress={() => onItemPress?.(item.key)}>
              <View style={styles.optionIcon}>
                <LineIcon name={item.icon} size={21} color={colors.text} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>{t(item.labelKey)}</Text>
              {rightAccessory?.(item.key) ?? <Text style={[styles.optionArrow, { color: colors.faintText }]}>›</Text>}
            </Pressable>
            {index < items.length - 1 ? <View style={[styles.optionDivider, { backgroundColor: colors.divider }]} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function SettingSwitch({ value, disabled = false, onValueChange }: { value: boolean; disabled?: boolean; onValueChange: (value: boolean) => void }) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  return (
    <Pressable style={styles.switchHitArea} disabled={disabled} onPress={() => onValueChange(!value)}>
      <Animated.View
        style={[
          styles.switchTrack,
          disabled ? styles.switchTrackDisabled : null,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.divider, colors.inverse],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            { backgroundColor: colors.card },
            {
              transform: [{
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 22],
                }),
              }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function AnimatedAvailability({
  disabled,
  children,
  style,
}: {
  disabled: boolean;
  children: React.ReactNode;
  style?: object;
}) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(disabled ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: disabled ? 0 : 1,
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [disabled, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.cardMuted, colors.card],
          }),
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.62, 1],
          }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function TimeWheelPicker({
  options,
  value,
  closing,
  onChange,
  onClose,
}: {
  options: string[];
  value: string;
  closing: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const { darkMode, colors } = useAppTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    const selectedIndex = Math.max(0, options.indexOf(value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * TIME_WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, [options, value]);

  const selectByOffset = (offsetY: number) => {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(offsetY / TIME_WHEEL_ITEM_HEIGHT)));
    onChange(options[index]);
  };

  const closeWithAnimation = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 170,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  useEffect(() => {
    if (closing) closeWithAnimation();
  }, [closing]);

  return (
    <Animated.View
      style={[
        styles.timeWheelOverlay,
        {
          opacity: progress,
          transform: [{
            scaleY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.72, 1],
            }),
          }],
        },
      ]}
    >
      <Animated.View style={[styles.timeWheelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          pointerEvents="none"
          colors={darkMode
            ? ['rgba(24,24,27,0)', '#193323', '#245a38', '#193323', 'rgba(24,24,27,0)']
            : ['rgba(255,255,255,0)', '#eef7f0', '#dceee1', '#eef7f0', 'rgba(255,255,255,0)']
          }
          locations={[0, 0.08, 0.5, 0.92, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.timeWheelCenterBand}
        />
        <LinearGradient
          pointerEvents="none"
          colors={darkMode
            ? [colors.card, 'rgba(24,24,27,0)', 'rgba(24,24,27,0)', colors.card]
            : ['#ffffff', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', '#ffffff']
          }
          locations={[0, 0.24, 0.76, 1]}
          style={styles.timeWheelFade}
        />
        <ScrollView
          ref={scrollRef}
          style={styles.timeWheelScroll}
          contentContainerStyle={styles.timeWheelContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onScrollEndDrag={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
          onMomentumScrollEnd={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
        >
          {options.map((time) => (
            <Pressable
              key={time}
              style={styles.timeWheelOption}
              onPress={() => {
                onChange(time);
                closeWithAnimation();
              }}
            >
              <Text style={[styles.timeWheelOptionText, time === value ? styles.timeWheelOptionTextActive : null, { color: time === value ? (darkMode ? colors.text : '#0f5f2d') : colors.faintText }]}>{time}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const { darkMode, setDarkMode, colors } = useAppTheme();
  const { language, setLanguage, t } = useAppLanguage();
  const [profiles, setProfiles] = useState<DivinationProfile[]>(() => profileScreenCache?.profiles ?? []);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(() => profileScreenCache?.userProfile);
  const [profileStats, setProfileStats] = useState<ProfileStats>(() => profileScreenCache?.profileStats ?? { castCount: 0, fulfilledCount: 0 });
  const [guestMode, setGuestMode] = useState(() => profileScreenCache?.guestMode ?? false);
  const [contentReady, setContentReady] = useState(() => Boolean(profileScreenCache));
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(false);
  const [quietTimePicker, setQuietTimePicker] = useState<'start' | 'end' | undefined>();
  const [closingQuietTimePicker, setClosingQuietTimePicker] = useState<'start' | 'end' | undefined>();
  const [notificationCardLayout, setNotificationCardLayout] = useState<LayoutBox>();
  const [startTimeHitBox, setStartTimeHitBox] = useState<LayoutBox>();
  const [endTimeHitBox, setEndTimeHitBox] = useState<LayoutBox>();
  const edgeSwipeActive = useRef(false);
  const edgeBackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        edgeSwipeActive.current = event.nativeEvent.pageX <= 24;
        return false;
      },
      onMoveShouldSetPanResponder: (event, gesture) => {
        const startsAtEdge = edgeSwipeActive.current || event.nativeEvent.pageX <= 24;
        return startsAtEdge && gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 64 || gesture.vx > 0.45) {
          navigation.goBack();
        }
        edgeSwipeActive.current = false;
      },
      onPanResponderTerminate: () => {
        edgeSwipeActive.current = false;
      },
    })
  ).current;

  const refreshProfiles = async () => {
    const [nextProfiles, records, nextGuestMode] = await Promise.all([listProfiles(), listRecords(), isGuestMode()]);
    const selfProfile = nextProfiles.find((profile) => profile.id === 'self' || profile.relation === '本人');
    const nextUserProfile = selfProfile ? await syncUserProfileFromSelfArchive(selfProfile) : await getUserProfile();
    const nextStats = {
      castCount: records.length,
      fulfilledCount: records.filter((record) => latestRecordFulfilled(record)).length,
    };
    profileScreenCache = {
      profiles: nextProfiles,
      userProfile: nextUserProfile,
      profileStats: nextStats,
      guestMode: nextGuestMode,
    };
    setProfiles(nextProfiles);
    setUserProfile(nextUserProfile);
    setGuestMode(nextGuestMode);
    setProfileStats(nextStats);
    setContentReady(true);
  };

  const refreshNotificationState = async () => {
    const notifications = getNotificationsModule();
    const settings = await getNotificationSettings();
    const permissions = notifications ? await notifications.getPermissionsAsync() : undefined;
    const systemEnabled = permissions ? notificationGranted(permissions, notifications) : false;
    const nextSettings = settings.pushEnabled && !systemEnabled
      ? await saveNotificationSettings({ ...settings, pushEnabled: false })
      : settings;
    setNotificationSettings(nextSettings);
    setSystemNotificationsEnabled(systemEnabled);
  };

  useFocusEffect(
    useCallback(() => {
      refreshProfiles();
      refreshNotificationState();
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNotificationState();
    });
    return () => subscription.remove();
  }, []);

  const updateNotificationSettings = async (patch: Partial<NotificationSettings>) => {
    const nextSettings = await saveNotificationSettings({ ...notificationSettings, ...patch });
    setNotificationSettings(nextSettings);
  };

  const togglePushNotifications = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setQuietTimePicker(undefined);
      await updateNotificationSettings({ pushEnabled: false });
      return;
    }
    const notifications = getNotificationsModule();
    if (!notifications) {
      Alert.alert(t('notification.unsupportedTitle'), t('notification.unsupportedBody'));
      await updateNotificationSettings({ pushEnabled: false });
      setSystemNotificationsEnabled(false);
      return;
    }
    let permissions = await notifications.getPermissionsAsync();
    if (!permissions.granted) {
      permissions = await notifications.requestPermissionsAsync();
    }
    const granted = notificationGranted(permissions, notifications);
    setSystemNotificationsEnabled(granted);
    if (!granted) {
      Alert.alert(t('notification.systemOffTitle'), t('notification.systemOffBody'));
      await updateNotificationSettings({ pushEnabled: false });
      return;
    }
    await updateNotificationSettings({ pushEnabled: true });
  };
  const notificationTypesDisabled = !notificationSettings.pushEnabled;
  const quietSectionDisabled = !notificationSettings.pushEnabled;
  const quietTimeDisabled = quietSectionDisabled || !notificationSettings.quietHoursEnabled;

  useEffect(() => {
    if (quietTimeDisabled) {
      setQuietTimePicker(undefined);
      setClosingQuietTimePicker(undefined);
    }
  }, [quietTimeDisabled]);

  const closeNotificationModal = () => {
    setQuietTimePicker(undefined);
    setClosingQuietTimePicker(undefined);
    setNotificationModalVisible(false);
  };

  const closeLanguageModal = () => setLanguageModalVisible(false);

  const selectLanguage = async (nextLanguage: AppLanguage) => {
    await setLanguage(nextLanguage);
    closeLanguageModal();
  };

  const closeQuietTimePicker = () => {
    if (!quietTimePicker) return;
    setClosingQuietTimePicker(quietTimePicker);
  };

  const finishCloseQuietTimePicker = () => {
    setQuietTimePicker(undefined);
    setClosingQuietTimePicker(undefined);
  };

  const shouldKeepQuietTimePickerOpen = (box: LayoutBox | undefined, x: number, y: number) => {
    if (!box) return false;
    const wheelTop = box.y - 66;
    const wheelBottom = wheelTop + TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ITEMS;
    return x >= box.x && x <= box.x + box.width && y >= wheelTop && y <= wheelBottom;
  };

  const handleNotificationCardPress = (pageX: number, pageY: number) => {
    if (!quietTimePicker || !notificationCardLayout) return;
    const localX = pageX - notificationCardLayout.x;
    const localY = pageY - notificationCardLayout.y;
    const activeBox = quietTimePicker === 'start' ? startTimeHitBox : endTimeHitBox;
    if (shouldKeepQuietTimePickerOpen(activeBox, localX, localY)) return;
    closeQuietTimePicker();
  };

  const openArchive = (profile: DivinationProfile) => {
    navigation.navigate('ArchiveCenter', { profileId: profile.id });
  };

  const createArchive = async () => {
    const profile = await addProfile();
    setProfiles((current) => [...current, profile]);
    navigation.navigate('ArchiveCenter', { profileId: profile.id });
  };

  const goToLoginFresh = async () => {
    await Promise.all([clearStoredLogin(), disableGuestMode()]);
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  };

  const handleMemberCenterPress = async () => {
    if (await isGuestMode()) {
      alertGuestRequiresLogin('membership', t, goToLoginFresh);
      return;
    }
    navigation.navigate('MemberCenter');
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await Promise.all([clearStoredLogin(), clearLocalUserProfile(), disableGuestMode()]);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: '#fff' }]} onPress={() => navigation.goBack()}>
          {Platform.OS === 'android' ? <LineIcon name="chevronLeft" size={25} color={colors.controlText} /> : <Text style={[styles.backButtonText, { color: colors.controlText }]}>‹</Text>}
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        <AppMoreMenu navigation={navigation} currentScreen="Profile" buttonBackgroundColor="#fff" />
      </View>

      {contentReady ? <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {userProfile?.avatarUri ? (
                <Image source={{ uri: userProfile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profileInitial(userProfile?.nickname)}</Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{userProfile?.nickname || t('profile.unnamed')}</Text>
              <View style={styles.userTypeRow}>
                <LineIcon name="user" size={12} color="#777" stroke={1.6} />
                <Text style={[styles.userType, { color: colors.faintText }]}>{guestMode ? t('profile.guest') : t('profile.normal')}</Text>
              </View>
            </View>
            <Pressable style={[styles.editButton, { backgroundColor: colors.control }]} onPress={() => navigation.navigate('ProfileEdit')}>
              <LineIcon name="edit" size={18} color={colors.controlText} />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.memberBanner,
            ]}
            onPress={handleMemberCenterPress}
          >
            <View>
              <Text style={styles.memberTitle}>{t('profile.memberBanner')}</Text>
              <Text style={styles.memberSubtitle}>{t('profile.memberSubtitle')}</Text>
            </View>
            <Text style={styles.memberArrow}>›</Text>
          </Pressable>

          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statsRow}>
            <Pressable style={styles.statItem} onPress={() => navigation.navigate('Save', { initialFilter: 'all' })}>
              <Text style={[styles.statValue, { color: colors.text }]}>{profileStats.castCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>{t('profile.castCount')}</Text>
            </Pressable>
            <View style={[styles.verticalDivider, { backgroundColor: colors.divider }]} />
            <Pressable style={styles.statItem} onPress={() => navigation.navigate('Save', { initialFilter: 'fulfilled' })}>
              <Text style={[styles.statValue, { color: colors.text }]}>{profileStats.fulfilledCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>{t('profile.fulfilledCount')}</Text>
            </Pressable>
          </View>
        </View>

        <ProfileArchiveRow profiles={profiles} onSelect={openArchive} onAdd={createArchive} />

        <View style={styles.quickEntryGrid}>
          <QuickEntryCard
            icon="crown"
            title={t('profile.memberCenter')}
            subtitle={t('profile.memberEntrySubtitle')}
            accent={darkMode ? '#3a301b' : '#fff0cc'}
            onPress={handleMemberCenterPress}
          />
          <QuickEntryCard
            icon="user"
            title={t('archive.title')}
            subtitle={t('profile.archiveEntrySubtitle')}
            accent={darkMode ? '#173225' : '#d1fae5'}
            onPress={() => navigation.navigate('ArchiveCenter')}
          />
          <QuickEntryCard
            icon="history"
            title={t('history.title')}
            subtitle={t('profile.historyEntrySubtitle')}
            accent={darkMode ? '#172554' : '#dbeafe'}
            onPress={() => navigation.navigate('Save', { initialFilter: 'all' })}
          />
        </View>
        <MenuCard
          title={t('profile.appSettings')}
          items={SETTING_ITEMS}
          onItemPress={(key) => {
            if (key === 'notifications') setNotificationModalVisible(true);
            if (key === 'language') setLanguageModalVisible(true);
            if (key === 'feedback') navigation.navigate('Feedback');
            if (key === 'about') navigation.navigate('About');
          }}
          rightAccessory={(key) => (
            key === 'darkMode'
              ? <SettingSwitch value={darkMode} onValueChange={setDarkMode} />
              : undefined
          )}
        />

        <Pressable style={[styles.logoutCard, { backgroundColor: colors.card }]} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </Pressable>
      </ScrollView> : null}
      <Modal transparent visible={notificationModalVisible} animationType="fade" onRequestClose={closeNotificationModal}>
        <View style={[styles.notificationBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNotificationModal} />
          <Pressable
            style={[styles.notificationCard, { backgroundColor: colors.card }]}
            onLayout={(event) => setNotificationCardLayout(event.nativeEvent.layout)}
            onPress={(event) => handleNotificationCardPress(event.nativeEvent.pageX, event.nativeEvent.pageY)}
          >
            <View style={styles.notificationHeader}>
              <View>
                <Text style={[styles.notificationTitle, { color: colors.text }]}>{t('notification.title')}</Text>
                <Text style={[styles.notificationSubtitle, { color: colors.faintText }]}>{t('notification.subtitle')}</Text>
              </View>
              <Pressable style={[styles.notificationClose, { backgroundColor: colors.control }]} onPress={closeNotificationModal}>
                <Text style={[styles.notificationCloseText, { color: colors.controlText }]}>×</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.systemStatusCard, { backgroundColor: systemNotificationsEnabled ? colors.greenSoft : colors.redSoft }]}
              onPress={() => Linking.openSettings()}
            >
              <View style={[styles.systemStatusIcon, { backgroundColor: colors.card }]}>
                <LineIcon name="bell" size={21} color={systemNotificationsEnabled ? '#0f6b38' : '#777'} />
              </View>
              <View style={styles.systemStatusTextWrap}>
                <Text style={[styles.systemStatusTitle, { color: colors.mutedText }]}>{t('notification.system')}</Text>
                <Text style={[styles.systemStatusValue, systemNotificationsEnabled ? styles.systemStatusValueOn : null]}>
                  {systemNotificationsEnabled ? t('common.enabled') : t('common.disabled')}
                </Text>
              </View>
              <Text style={[styles.systemStatusArrow, { color: colors.faintText }]}>›</Text>
            </Pressable>

            <View style={[styles.pushSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationRowText}>
                  <Text style={[styles.notificationRowTitle, { color: colors.text }]}>{t('notification.push')}</Text>
                  <Text style={[styles.notificationRowDesc, { color: colors.faintText }]}>{t('notification.pushDesc')}</Text>
                </View>
                <SettingSwitch value={notificationSettings.pushEnabled} onValueChange={togglePushNotifications} />
              </View>
            </View>

            <AnimatedAvailability disabled={notificationTypesDisabled} style={[styles.notificationSection, { borderColor: colors.border }]}>
              <Text style={[styles.notificationSectionTitle, { color: colors.faintText }]}>{t('notification.types')}</Text>
              <View style={styles.notificationRow}>
                <View style={styles.notificationRowText}>
                  <Text style={[styles.notificationRowTitle, { color: colors.text }, notificationTypesDisabled ? styles.notificationTextDisabled : null]}>{t('notification.daily')}</Text>
                  <Text style={[styles.notificationRowDesc, { color: colors.faintText }]}>{t('notification.dailyDesc')}</Text>
                </View>
                <SettingSwitch disabled={notificationTypesDisabled} value={notificationSettings.dailyCheckIn} onValueChange={(value) => updateNotificationSettings({ dailyCheckIn: value })} />
              </View>
              <View style={[styles.notificationDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.notificationRow}>
                <View style={styles.notificationRowText}>
                  <Text style={[styles.notificationRowTitle, { color: colors.text }, notificationTypesDisabled ? styles.notificationTextDisabled : null]}>{t('notification.reading')}</Text>
                  <Text style={[styles.notificationRowDesc, { color: colors.faintText }]}>{t('notification.readingDesc')}</Text>
                </View>
                <SettingSwitch disabled={notificationTypesDisabled} value={notificationSettings.readingComplete} onValueChange={(value) => updateNotificationSettings({ readingComplete: value })} />
              </View>
            </AnimatedAvailability>

            <AnimatedAvailability disabled={quietSectionDisabled} style={[styles.notificationSection, { borderColor: colors.border }]}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationRowText}>
                  <Text style={[styles.notificationRowTitle, { color: colors.text }, quietSectionDisabled ? styles.notificationTextDisabled : null]}>{t('notification.quiet')}</Text>
                  <Text style={[styles.notificationRowDesc, { color: colors.faintText }]}>{t('notification.quietDesc')}</Text>
                </View>
                <SettingSwitch disabled={quietSectionDisabled} value={notificationSettings.quietHoursEnabled} onValueChange={(value) => updateNotificationSettings({ quietHoursEnabled: value })} />
              </View>
              <View style={styles.quietTimeRow}>
                <View
                  style={styles.quietTimeColumn}
                  onLayout={(event) => setStartTimeHitBox(event.nativeEvent.layout)}
                >
                  <Pressable
                    style={[styles.quietTimePill, { backgroundColor: colors.cardMuted }, quietTimeDisabled ? styles.quietTimePillDisabled : null]}
                    disabled={quietTimeDisabled}
                    onPress={() => {
                      if (quietTimePicker === 'start') {
                        closeQuietTimePicker();
                        return;
                      }
                      setClosingQuietTimePicker(undefined);
                      setQuietTimePicker('start');
                    }}
                  >
                    <Text style={[styles.quietTimeLabel, { color: colors.faintText }]}>{t('notification.start')}</Text>
                    <Text style={[styles.quietTimeText, { color: colors.text }, quietTimeDisabled ? styles.notificationTextDisabled : null]}>{notificationSettings.quietStart}</Text>
                  </Pressable>
                  {quietTimePicker === 'start' && !quietTimeDisabled ? (
                    <TimeWheelPicker
                      options={allowedQuietTimes('start', notificationSettings.quietStart, notificationSettings.quietEnd)}
                      value={notificationSettings.quietStart}
                      closing={closingQuietTimePicker === 'start'}
                      onChange={(time) => updateNotificationSettings({ quietStart: time })}
                      onClose={finishCloseQuietTimePicker}
                    />
                  ) : null}
                </View>
                <Text style={styles.quietTimeArrow}>—</Text>
                <View
                  style={styles.quietTimeColumn}
                  onLayout={(event) => setEndTimeHitBox(event.nativeEvent.layout)}
                >
                  <Pressable
                    style={[styles.quietTimePill, { backgroundColor: colors.cardMuted }, quietTimeDisabled ? styles.quietTimePillDisabled : null]}
                    disabled={quietTimeDisabled}
                    onPress={() => {
                      if (quietTimePicker === 'end') {
                        closeQuietTimePicker();
                        return;
                      }
                      setClosingQuietTimePicker(undefined);
                      setQuietTimePicker('end');
                    }}
                  >
                    <Text style={[styles.quietTimeLabel, { color: colors.faintText }]}>{t('notification.end')}</Text>
                    <Text style={[styles.quietTimeText, { color: colors.text }, quietTimeDisabled ? styles.notificationTextDisabled : null]}>{notificationSettings.quietEnd}</Text>
                  </Pressable>
                  {quietTimePicker === 'end' && !quietTimeDisabled ? (
                    <TimeWheelPicker
                      options={allowedQuietTimes('end', notificationSettings.quietStart, notificationSettings.quietEnd)}
                      value={notificationSettings.quietEnd}
                      closing={closingQuietTimePicker === 'end'}
                      onChange={(time) => updateNotificationSettings({ quietEnd: time })}
                      onClose={finishCloseQuietTimePicker}
                    />
                  ) : null}
                </View>
              </View>
            </AnimatedAvailability>
          </Pressable>
        </View>
      </Modal>
      <Modal transparent visible={languageModalVisible} animationType="fade" onRequestClose={closeLanguageModal}>
        <View style={[styles.notificationBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLanguageModal} />
          <View style={[styles.languageCard, { backgroundColor: colors.card }]}>
            <View style={styles.notificationHeader}>
              <View>
                <Text style={[styles.notificationTitle, { color: colors.text }]}>{t('language.title')}</Text>
                <Text style={[styles.notificationSubtitle, { color: colors.faintText }]}>{t('language.subtitle')}</Text>
              </View>
              <Pressable style={[styles.notificationClose, { backgroundColor: colors.control }]} onPress={closeLanguageModal}>
                <Text style={[styles.notificationCloseText, { color: colors.controlText }]}>×</Text>
              </Pressable>
            </View>
            {(['zh', 'en'] as AppLanguage[]).map((item) => {
              const active = language === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.languageOption, { backgroundColor: active ? colors.greenSoft : colors.cardMuted }]}
                  onPress={() => selectLanguage(item)}
                >
                  <View>
                    <Text style={[styles.languageOptionTitle, { color: active ? '#0f6b38' : colors.text }]}>
                      {item === 'zh' ? t('language.zh') : t('language.en')}
                    </Text>
                    {active ? <Text style={[styles.languageOptionHint, { color: colors.faintText }]}>{t('common.current')}</Text> : null}
                  </View>
                  {active ? <LineIcon name="check" size={20} color="#0f6b38" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  topLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 },
  edgeBackGestureArea: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 45, elevation: 45 },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 42,
    elevation: 4,
  },
  backButtonText: {
    color: '#111',
    fontSize: 34,
    fontWeight: '500',
    lineHeight: 38,
    marginTop: -2,
    ...Platform.select({ android: { lineHeight: 40, marginTop: 0, includeFontPadding: false, textAlignVertical: 'center' } }),
  },
  navTitle: {
    position: 'absolute',
    top: 69,
    left: 88,
    right: 88,
    color: '#111',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  scroll: { position: 'absolute', left: 0, right: 0, top: 104, bottom: 0 },
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 40, gap: 14 },
  profileCard: {
    ...CARD_SHADOW,
    minHeight: 256,
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 14,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  userInfo: { flex: 1, gap: 5 },
  userName: { color: '#000', fontSize: 20, fontWeight: '900' },
  userTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userType: { color: '#777', fontSize: 12, fontWeight: '800' },
  editButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f1f1', alignItems: 'center', justifyContent: 'center' },
  memberBanner: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#111',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  memberSubtitle: { color: '#cfcfcf', fontSize: 11, fontWeight: '700', marginTop: 5 },
  memberArrow: { color: '#fff', fontSize: 28, fontWeight: '600' },
  memberPlanIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberPlanTextWrap: { flex: 1, gap: 3 },
  memberPlanLabel: { fontSize: 10, fontWeight: '900' },
  memberPlanTitle: { fontSize: 17, fontWeight: '900' },
  memberPlanSubtitle: { fontSize: 11, fontWeight: '800' },
  statDivider: { height: 1, backgroundColor: '#ececec' },
  statsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statValue: { color: '#000', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#666', fontSize: 12, fontWeight: '800' },
  verticalDivider: { width: 1, height: 42, backgroundColor: '#e8e8e8' },
  archiveSection: {
    marginHorizontal: -18,
  },
  archiveContent: {
    paddingHorizontal: 18,
    gap: 14,
  },
  archiveItem: {
    width: 58,
    alignItems: 'center',
    gap: 7,
  },
  profileInitialAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden',
  },
  profileInitialImage: { width: 54, height: 54, borderRadius: 27 },
  profileInitialText: { color: '#111', fontSize: 18, fontWeight: '900' },
  addArchiveAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addArchiveText: { color: '#fff', fontSize: 26, fontWeight: '500', lineHeight: 28, marginTop: -2 },
  archiveName: { width: 58, color: '#666', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  quickEntryGrid: { gap: 10 },
  quickEntryCard: {
    ...CARD_SHADOW,
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  quickEntryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  quickEntryTextWrap: { flex: 1, gap: 4 },
  quickEntryTitle: { color: '#111', fontSize: 16, fontWeight: '900' },
  quickEntrySubtitle: { color: '#666', fontSize: 11, fontWeight: '800' },
  quickEntryArrow: { color: '#777', fontSize: 24, fontWeight: '500' },
  smallCard: { ...CARD_SHADOW, borderRadius: 20, backgroundColor: '#fff', paddingTop: 16, overflow: 'hidden' },
  smallCardTitle: { color: '#000', fontSize: 16, fontWeight: '900', paddingHorizontal: 16, marginBottom: 8 },
  optionList: { backgroundColor: '#fff' },
  optionRow: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  optionIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, color: '#111', fontSize: 14, fontWeight: '900' },
  optionArrow: { color: '#777', fontSize: 23, fontWeight: '500' },
  optionDivider: { height: 1, backgroundColor: '#ededed', marginLeft: 52 },
  switchHitArea: { padding: 4, marginRight: -4 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  switchTrackDisabled: { opacity: 0.38 },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  notificationBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  notificationCard: { ...CARD_SHADOW, width: '100%', maxWidth: 420, borderRadius: 24, backgroundColor: '#fff', padding: 18, gap: 14, overflow: 'visible' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notificationTitle: { color: '#111', fontSize: 19, fontWeight: '900' },
  notificationSubtitle: { color: '#777', fontSize: 12, fontWeight: '800', marginTop: 4 },
  notificationClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  notificationCloseText: { color: '#111', fontSize: 24, fontWeight: '700', lineHeight: 27, marginTop: -2 },
  languageCard: { ...CARD_SHADOW, width: '100%', maxWidth: 380, borderRadius: 24, backgroundColor: '#fff', padding: 18, gap: 12 },
  languageOption: { minHeight: 64, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageOptionTitle: { color: '#111', fontSize: 16, fontWeight: '900' },
  languageOptionHint: { color: '#777', fontSize: 11, fontWeight: '800', marginTop: 4 },
  systemStatusCard: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  systemStatusCardOn: { backgroundColor: '#eaf7ee' },
  systemStatusCardOff: { backgroundColor: '#fff1ef' },
  systemStatusIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  systemStatusTextWrap: { flex: 1, gap: 3 },
  systemStatusTitle: { color: '#555', fontSize: 12, fontWeight: '900' },
  systemStatusValue: { color: '#777', fontSize: 16, fontWeight: '900' },
  systemStatusValueOn: { color: '#0f6b38' },
  systemStatusArrow: { color: '#777', fontSize: 24, fontWeight: '600', marginLeft: 4 },
  pushSection: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eeeeee', overflow: 'hidden' },
  notificationSection: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eeeeee', paddingTop: 10 },
  notificationSectionDisabled: { backgroundColor: '#fafafa' },
  notificationSectionTitle: { color: '#777', fontSize: 12, fontWeight: '900', paddingHorizontal: 14, marginBottom: 2 },
  notificationRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  notificationRowText: { flex: 1, gap: 4 },
  notificationRowTitle: { color: '#111', fontSize: 14, fontWeight: '900' },
  notificationRowDesc: { color: '#777', fontSize: 11, fontWeight: '700', lineHeight: 15 },
  notificationTextDisabled: { color: '#aaa' },
  notificationDivider: { height: 1, backgroundColor: '#ededed', marginLeft: 14 },
  quietTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  quietTimeColumn: { flex: 1, position: 'relative', zIndex: 12, elevation: 12 },
  quietTimePill: { height: 48, borderRadius: 15, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', gap: 2 },
  quietTimePillDisabled: { backgroundColor: '#fafafa', opacity: 0.58 },
  quietTimeLabel: { color: '#777', fontSize: 10, fontWeight: '900' },
  quietTimeText: { color: '#111', fontSize: 15, fontWeight: '900' },
  quietTimeArrow: { color: '#888', fontSize: 15, fontWeight: '900' },
  timeWheelOverlay: { position: 'absolute', left: -2, right: -2, top: -66, height: TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ITEMS, zIndex: 30, elevation: 30 },
  timeWheelCard: { ...CARD_SHADOW, flex: 1, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#ededed' },
  timeWheelCenterBand: { position: 'absolute', left: 0, right: 0, top: TIME_WHEEL_SIDE_PADDING, height: TIME_WHEEL_ITEM_HEIGHT, zIndex: 0 },
  timeWheelFade: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  timeWheelScroll: { flex: 1, zIndex: 1 },
  timeWheelContent: { paddingVertical: TIME_WHEEL_SIDE_PADDING },
  timeWheelOption: { height: TIME_WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  timeWheelOptionText: { color: '#8a8a8a', fontSize: 13, fontWeight: '900' },
  timeWheelOptionTextActive: { color: '#0f5f2d', fontSize: 15 },
  logoutCard: {
    ...CARD_SHADOW,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#d23b32', fontSize: 15, fontWeight: '900' },
});
