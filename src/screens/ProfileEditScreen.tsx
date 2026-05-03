import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Keyboard, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';
import { getUserProfile, saveUserProfile, UserProfile } from '../storage/userProfileStore';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;
type CalendarMode = 'solar' | 'lunar';
type ProfileField = 'nickname' | 'gender' | 'birthday';
type RegisterProvider = 'phone' | 'email' | 'wechat' | 'apple';

const GENDERS: UserProfile['gender'][] = ['未设置', '男', '女'];
const YEARS = Array.from({ length: 81 }, (_, index) => 1960 + index);
const SOLAR_MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
const SOLAR_DAYS = Array.from({ length: 31 }, (_, index) => `${index + 1}日`);
const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const SOLAR_HOURS = Array.from({ length: 24 }, (_, index) => `${index}时`);
const LUNAR_HOURS = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const PICKER_ITEM_HEIGHT = 38;
const PICKER_VISIBLE_ROWS = 5;
const PICKER_VERTICAL_PADDING = PICKER_ITEM_HEIGHT * 2;
const LUNAR_MONTH_EN: Record<string, string> = {
  正月: '1st lunar month',
  二月: '2nd lunar month',
  三月: '3rd lunar month',
  四月: '4th lunar month',
  五月: '5th lunar month',
  六月: '6th lunar month',
  七月: '7th lunar month',
  八月: '8th lunar month',
  九月: '9th lunar month',
  十月: '10th lunar month',
  冬月: '11th lunar month',
  腊月: '12th lunar month',
};
const LUNAR_DAY_EN: Record<string, string> = {
  初一: 'day 1',
  初二: 'day 2',
  初三: 'day 3',
  初四: 'day 4',
  初五: 'day 5',
  初六: 'day 6',
  初七: 'day 7',
  初八: 'day 8',
  初九: 'day 9',
  初十: 'day 10',
  十一: 'day 11',
  十二: 'day 12',
  十三: 'day 13',
  十四: 'day 14',
  十五: 'day 15',
  十六: 'day 16',
  十七: 'day 17',
  十八: 'day 18',
  十九: 'day 19',
  二十: 'day 20',
  廿一: 'day 21',
  廿二: 'day 22',
  廿三: 'day 23',
  廿四: 'day 24',
  廿五: 'day 25',
  廿六: 'day 26',
  廿七: 'day 27',
  廿八: 'day 28',
  廿九: 'day 29',
  三十: 'day 30',
};
const BASE_INFO: Array<{ field: ProfileField; icon: LineIconName; titleKey: TranslationKey }> = [
  { field: 'nickname', icon: 'name', titleKey: 'profileEdit.nickname' },
  { field: 'gender', icon: 'gender', titleKey: 'profileEdit.gender' },
  { field: 'birthday', icon: 'calendar', titleKey: 'profileEdit.birthday' },
];

function getMockRegisterProvider(): RegisterProvider {
  return 'wechat';
}

const MOCK_REGISTER_PROVIDER = getMockRegisterProvider();

const BINDING_INFO: Array<{ key: 'phone' | 'email' | 'wechat' | 'apple'; icon: LineIconName; titleKey: TranslationKey; bound: boolean; bindable: boolean }> = [
  { key: 'phone', icon: 'phone', titleKey: 'bind.phone', bound: MOCK_REGISTER_PROVIDER === 'phone', bindable: true },
  { key: 'email', icon: 'mail', titleKey: 'bind.email', bound: MOCK_REGISTER_PROVIDER === 'email', bindable: true },
  { key: 'wechat', icon: 'wechat', titleKey: 'profileEdit.wechat', bound: MOCK_REGISTER_PROVIDER === 'wechat', bindable: false },
  { key: 'apple', icon: 'apple', titleKey: 'profileEdit.appleId', bound: MOCK_REGISTER_PROVIDER === 'apple', bindable: false },
];

const SECURITY_INFO: Array<{ icon: LineIconName; titleKey: TranslationKey; valueKey?: TranslationKey; value: string }> = [
  { icon: 'tag', titleKey: 'profileEdit.userId', value: 'QW-20260501' },
  { icon: 'calendar', titleKey: 'profileEdit.registerTime', value: '2026-05-01' },
  { icon: 'shield', titleKey: 'profileEdit.loginMethod', valueKey: 'profileEdit.wechat', value: '微信' },
];

function applyBirthdayStringToPicker(
  birthday: string,
  setters: {
    setCalendarMode: (mode: CalendarMode) => void;
    setYear: (value: string) => void;
    setSolarMonth: (value: string) => void;
    setSolarDay: (value: string) => void;
    setSolarHour: (value: string) => void;
    setLunarMonth: (value: string) => void;
    setLunarDay: (value: string) => void;
    setLunarHour: (value: string) => void;
  }
) {
  const parts = birthday.trim().split(/\s+/);
  if (parts.length < 5) return;
  const [mode, yearValue, monthValue, dayValue, hourValue] = parts;
  setters.setYear(yearValue);
  if (mode === '农历') {
    setters.setCalendarMode('lunar');
    setters.setLunarMonth(monthValue);
    setters.setLunarDay(dayValue);
    setters.setLunarHour(hourValue);
    return;
  }
  if (mode === '公历') {
    setters.setCalendarMode('solar');
    setters.setSolarMonth(monthValue);
    setters.setSolarDay(dayValue);
    setters.setSolarHour(hourValue);
  }
}

function numberFromChineseUnit(value: string, unit: '年' | '月' | '日' | '时') {
  const parsed = Number.parseInt(value.replace(unit, ''), 10);
  return Number.isNaN(parsed) ? value : parsed;
}

function formatBirthdayForDisplay(value: string, language: 'zh' | 'en', t: (key: TranslationKey) => string) {
  if (language !== 'en') return value;
  const parts = value.trim().split(/\s+/);
  if (parts.length < 5) return value;
  const [mode, yearValue, monthValue, dayValue, hourValue] = parts;
  if (mode === '公历') {
    return `${t('profileEdit.solar')} ${numberFromChineseUnit(yearValue, '年')}, ${numberFromChineseUnit(monthValue, '月')}/${numberFromChineseUnit(dayValue, '日')} ${numberFromChineseUnit(hourValue, '时')}:00`;
  }
  if (mode === '农历') {
    return `${t('profileEdit.lunar')} ${numberFromChineseUnit(yearValue, '年')}, ${LUNAR_MONTH_EN[monthValue] ?? monthValue} ${LUNAR_DAY_EN[dayValue] ?? dayValue} ${hourValue}`;
  }
  return value;
}

function calendarPickerDisplayValue(value: string, language: 'zh' | 'en') {
  if (language !== 'en') return value;
  if (LUNAR_HOURS.includes(value)) return value;
  if (value.endsWith('年')) return `${numberFromChineseUnit(value, '年')}`;
  if (value.endsWith('月')) return `${numberFromChineseUnit(value, '月')}`;
  if (value.endsWith('日')) return `${numberFromChineseUnit(value, '日')}`;
  if (value.endsWith('时')) return `${numberFromChineseUnit(value, '时')}:00`;
  return LUNAR_MONTH_EN[value] ?? LUNAR_DAY_EN[value] ?? value;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.infoCardTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StaticRow({ icon, title, value, bound, bindable = false, onBind }: { icon: LineIconName; title: string; value: string; bound?: boolean; bindable?: boolean; onBind?: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const unbound = bound === false;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={styles.infoIcon}>
          <LineIcon name={icon} size={20} />
        </View>
        <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.bindingValueRow}>
        <Text style={[styles.infoValue, { color: colors.mutedText }]}>{value}</Text>
        {unbound && bindable && onBind ? (
          <Pressable style={[styles.bindButton, { backgroundColor: colors.inverse }]} onPress={onBind}>
            <Text style={[styles.bindButtonText, { color: colors.inverseText }]}>{t('common.bind')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PickerColumn({
  values,
  selected,
  onSelect,
  opacity,
  displayValue,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  opacity?: Animated.Value;
  displayValue?: (value: string) => string;
}) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const valuesKey = values.join('|');

  useEffect(() => {
    const selectedIndex = Math.max(0, values.indexOf(selected));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * PICKER_ITEM_HEIGHT, animated: false });
    });
  }, [selected, valuesKey]);

  const selectByOffset = (offsetY: number) => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / PICKER_ITEM_HEIGHT)));
    onSelect(values[index]);
  };

  const selectByTap = (value: string) => {
    const index = Math.max(0, values.indexOf(value));
    onSelect(value);
    scrollRef.current?.scrollTo({ y: index * PICKER_ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.pickerColumnWrap}>
      <Animated.View style={[styles.pickerTextLayer, { opacity: opacity ?? 1 }]}>
        <Animated.ScrollView
          ref={scrollRef}
          style={styles.pickerColumn}
          contentContainerStyle={styles.pickerColumnContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={PICKER_ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
        >
          {values.map((value, index) => {
            const inputRange = [
              (index - 1) * PICKER_ITEM_HEIGHT,
              index * PICKER_ITEM_HEIGHT,
              (index + 1) * PICKER_ITEM_HEIGHT,
            ];
            const scale = scrollY.interpolate({
              inputRange,
              outputRange: [0.96, 1.08, 0.96],
              extrapolate: 'clamp',
            });
            const itemOpacity = scrollY.interpolate({
              inputRange,
              outputRange: [0.45, 1, 0.45],
              extrapolate: 'clamp',
            });
            return (
              <Pressable
                key={value}
                style={styles.pickerOption}
                onPress={() => selectByTap(value)}
              >
                <Animated.Text
                  style={[
                    styles.pickerOptionText,
                    { color: colors.text, opacity: itemOpacity, transform: [{ scale }] },
                  ]}
                >
                  {displayValue ? displayValue(value) : value}
                </Animated.Text>
              </Pressable>
            );
          })}
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}

function EditableValueSlot({
  editing,
  value,
  editor,
}: {
  editing: boolean;
  value: string;
  editor: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(editing ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: editing ? 1 : 0,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [editing, progress]);

  const readonlyOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0.25, 0],
  });
  const editorOpacity = progress.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [0, 0, 1],
  });
  return (
    <View style={styles.editableSlot}>
      <Animated.View
        pointerEvents={editing ? 'none' : 'auto'}
        style={[
          styles.editableLayer,
          { opacity: readonlyOpacity },
        ]}
      >
        <Text numberOfLines={1} style={[styles.infoValue, styles.editableReadonlyValue, { color: colors.mutedText }]}>{value}</Text>
      </Animated.View>
      <Animated.View
        pointerEvents={editing ? 'auto' : 'none'}
        style={[
          styles.editableLayer,
          { opacity: editorOpacity },
        ]}
      >
        {editor}
      </Animated.View>
    </View>
  );
}

export function ProfileEditScreen({ navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const edgeSwipeActive = useRef(false);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('未命名用户');
  const [nicknameDraft, setNicknameDraft] = useState('未命名用户');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [gender, setGender] = useState<UserProfile['gender']>('未设置');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('solar');
  const calendarSwitchProgress = useRef(new Animated.Value(0)).current;
  const [birthdayVisible, setBirthdayVisible] = useState(false);
  const [calendarSwitchWidth, setCalendarSwitchWidth] = useState(0);
  const [year, setYear] = useState('2026年');
  const [solarMonth, setSolarMonth] = useState('3月');
  const [solarDay, setSolarDay] = useState('5日');
  const [lunarMonth, setLunarMonth] = useState('二月');
  const [lunarDay, setLunarDay] = useState('十五');
  const [solarHour, setSolarHour] = useState('12时');
  const [lunarHour, setLunarHour] = useState('子时');
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const deleteConfirmProgress = useRef(new Animated.Value(0)).current;
  const edgeBackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        edgeSwipeActive.current = event.nativeEvent.pageX <= 24;
        return false;
      },
      onMoveShouldSetPanResponder: (event, gesture) => {
        const startsAtEdge = edgeSwipeActive.current || event.nativeEvent.pageX <= 24;
        return startsAtEdge && gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4 && !birthdayVisible;
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

  const month = calendarMode === 'solar' ? solarMonth : lunarMonth;
  const day = calendarMode === 'solar' ? solarDay : lunarDay;
  const hour = calendarMode === 'solar' ? solarHour : lunarHour;
  const solarBirthday = language === 'en'
    ? `${t('profileEdit.solar')} ${numberFromChineseUnit(year, '年')}, ${numberFromChineseUnit(solarMonth, '月')}/${numberFromChineseUnit(solarDay, '日')} ${numberFromChineseUnit(solarHour, '时')}:00`
    : `公历 ${year} ${solarMonth} ${solarDay} ${solarHour}`;
  const lunarBirthday = language === 'en'
    ? `${t('profileEdit.lunar')} ${numberFromChineseUnit(year, '年')}, ${LUNAR_MONTH_EN[lunarMonth] ?? lunarMonth} ${LUNAR_DAY_EN[lunarDay] ?? lunarDay} ${lunarHour}`
    : `农历 ${year} ${lunarMonth} ${lunarDay} ${lunarHour}`;
  const birthday = `${calendarMode === 'solar' ? '公历' : '农历'} ${year} ${month} ${day} ${hour}`;
  const displayCalendarValue = (value: string) => calendarPickerDisplayValue(value, language);
  const deleteConfirmed = deleteConfirmText.trim() === '确认注销';
  const deleteConfirmButtonColor = deleteConfirmProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.faintText, '#c23a2b'],
  });

  useEffect(() => {
    Animated.timing(calendarSwitchProgress, {
      toValue: calendarMode === 'solar' ? 0 : 1,
      duration: 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [calendarMode, calendarSwitchProgress]);

  useEffect(() => {
    Animated.timing(deleteConfirmProgress, {
      toValue: deleteConfirmed ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [deleteConfirmProgress, deleteConfirmed]);

  const openDeleteAccountPrompt = () => {
    setDeleteConfirmText('');
    setDeleteReason('');
    setDeleteAccountVisible(true);
  };

  const closeDeleteAccountPrompt = () => {
    setDeleteAccountVisible(false);
    setDeleteConfirmText('');
    setDeleteReason('');
  };

  const toggleEditing = () => {
    if (editing) {
      const nextNickname = nicknameDraft.trim() || t('profile.unnamed');
      setNickname(nextNickname);
      saveUserProfile({ nickname: nextNickname, gender, birthday, avatarUri });
      Keyboard.dismiss();
      setEditing(false);
      return;
    }
    setNicknameDraft(nickname);
    setEditing(true);
  };

  useEffect(() => {
    getUserProfile().then((profile) => {
      setNickname(profile.nickname);
      setNicknameDraft(profile.nickname);
      setGender(profile.gender);
      setAvatarUri(profile.avatarUri);
      applyBirthdayStringToPicker(profile.birthday, {
        setCalendarMode,
        setYear,
        setSolarMonth,
        setSolarDay,
        setSolarHour,
        setLunarMonth,
        setLunarDay,
        setLunarHour,
      });
    });
  }, []);

  useEffect(() => {
    if (!editing) return;
    saveUserProfile({ nickname, gender, birthday, avatarUri });
  }, [avatarUri, birthday, editing, gender, nickname]);

  const selectAvatarFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profileEdit.albumDeniedTitle'), t('profileEdit.albumDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      const nextAvatarUri = result.assets[0]?.uri;
      setAvatarUri(nextAvatarUri);
      saveUserProfile({ nickname, gender, birthday, avatarUri: nextAvatarUri });
      setAvatarPickerVisible(false);
    }
  };

  const takeAvatarPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profileEdit.cameraDeniedTitle'), t('profileEdit.cameraDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      const nextAvatarUri = result.assets[0]?.uri;
      setAvatarUri(nextAvatarUri);
      saveUserProfile({ nickname, gender, birthday, avatarUri: nextAvatarUri });
      setAvatarPickerVisible(false);
    }
  };

  const switchCalendarMode = (mode: CalendarMode) => {
    if (mode === calendarMode) return;
    setCalendarMode(mode);
  };

  const valueForField = (field: ProfileField) => {
    if (field === 'nickname') return nickname;
    if (field === 'gender') {
      if (gender === '男') return t('profileEdit.genderMale');
      if (gender === '女') return t('profileEdit.genderFemale');
      return t('profileEdit.genderUnset');
    }
    return formatBirthdayForDisplay(birthday, language, t);
  };

  const renderBaseEditor = (field: ProfileField) => {
    if (field === 'nickname') {
      return <TextInput value={nicknameDraft} onChangeText={setNicknameDraft} placeholderTextColor={colors.faintText} style={[styles.inlineInput, { backgroundColor: colors.cardMuted, color: colors.text }]} />;
    }
    if (field === 'gender') {
      return (
        <View style={styles.genderSelect}>
          {GENDERS.map((item) => (
            <Pressable key={item} style={[styles.genderOption, { backgroundColor: gender === item ? colors.inverse : colors.cardMuted }, gender === item ? styles.genderOptionActive : null]} onPress={() => setGender(item)}>
              <Text style={[styles.genderText, { color: gender === item ? colors.inverseText : colors.mutedText }, gender === item ? styles.genderTextActive : null]}>
                {item === '男' ? t('profileEdit.genderMale') : item === '女' ? t('profileEdit.genderFemale') : t('profileEdit.genderUnset')}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }
    return (
      <Pressable style={[styles.dateValueButton, { backgroundColor: colors.cardMuted }]} onPress={() => setBirthdayVisible(true)}>
        <Text numberOfLines={1} style={[styles.dateValueText, { color: colors.text }]}>{formatBirthdayForDisplay(birthday, language, t)}</Text>
      </Pressable>
    );
  };

  const renderBaseValue = (field: ProfileField) => (
    <EditableValueSlot editing={editing} value={valueForField(field)} editor={renderBaseEditor(field)} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('profileEdit.title')}</Text>
        <Pressable style={[styles.editButton, { backgroundColor: editing ? colors.inverse : colors.control }, editing ? styles.editButtonActive : null]} onPress={toggleEditing}>
          <LineIcon name={editing ? 'check' : 'edit'} size={18} color={editing ? colors.inverseText : colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <Pressable style={styles.avatar} onPress={() => setAvatarPickerVisible(true)}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>问</Text>}
            <View style={[styles.avatarCameraBadge, { backgroundColor: darkMode ? '#050505' : colors.inverse, borderColor: colors.card }]}>
              <LineIcon name="edit" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.userName, { color: colors.text }]}>{nickname}</Text>
        </View>

        <InfoCard title={t('profileEdit.basicInfo')}>
          {BASE_INFO.map((item, index) => (
            <View key={item.field}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <View style={styles.infoIcon}>
                    <LineIcon name={item.icon} size={20} />
                  </View>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>{t(item.titleKey)}</Text>
                </View>
                {renderBaseValue(item.field)}
              </View>
              {index < BASE_INFO.length - 1 ? <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} /> : null}
            </View>
          ))}
        </InfoCard>

        <InfoCard title={t('profileEdit.accountBinding')}>
          {BINDING_INFO.map((item, index) => (
            <View key={item.key}>
              <StaticRow
                icon={item.icon}
                title={t(item.titleKey)}
                value={item.bound ? t('common.bound') : t('common.unbound')}
                bound={item.bound}
                bindable={item.bindable}
                onBind={
                  item.key === 'phone'
                    ? () => navigation.navigate('PhoneBind')
                    : item.key === 'email'
                      ? () => navigation.navigate('EmailBind')
                      : undefined
                }
              />
              {index < BINDING_INFO.length - 1 ? <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} /> : null}
            </View>
          ))}
        </InfoCard>

        <InfoCard title={t('profileEdit.accountSecurity')}>
          {SECURITY_INFO.map((item, index) => (
            <View key={item.titleKey}>
              <StaticRow icon={item.icon} title={t(item.titleKey)} value={item.valueKey ? t(item.valueKey) : item.value} />
              {index < SECURITY_INFO.length - 1 ? <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} /> : null}
            </View>
          ))}
        </InfoCard>

        <Pressable style={[styles.deleteAccountButton, { backgroundColor: colors.redSoft }]} onPress={openDeleteAccountPrompt}>
          <Text style={styles.deleteAccountText}>{t('profileEdit.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={birthdayVisible} animationType="fade" onRequestClose={() => setBirthdayVisible(false)}>
        <View style={[styles.dateModalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBirthdayVisible(false)} />
          <View style={[styles.dateModalCard, { backgroundColor: colors.card }]}>
            <View style={styles.dateModalHeader}>
              <Text style={[styles.dateModalTitle, { color: colors.text }]}>{t('profileEdit.chooseBirthday')}</Text>
              <Pressable style={[styles.dateCloseButton, { backgroundColor: colors.control }]} onPress={() => setBirthdayVisible(false)}>
                <Text style={[styles.dateCloseText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
            <View style={[styles.calendarSwitch, { backgroundColor: colors.control }]} onLayout={(event) => setCalendarSwitchWidth(event.nativeEvent.layout.width)}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.calendarSlider,
                  {
                    transform: [
                      {
                        translateX: calendarSwitchProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, Math.max(0, (calendarSwitchWidth - 12) / 2)],
                        }),
                      },
                    ],
                  },
                ]}
              />
              {(['solar', 'lunar'] as CalendarMode[]).map((mode) => (
                <Pressable key={mode} style={[styles.calendarOption, calendarMode === mode ? styles.calendarOptionActive : null]} onPress={() => switchCalendarMode(mode)}>
                  <Text style={[styles.calendarText, { color: calendarMode === mode ? '#0f5f2d' : colors.mutedText }, calendarMode === mode ? styles.calendarTextActive : null]}>{mode === 'solar' ? t('profileEdit.solar') : t('profileEdit.lunar')}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.pickerRow}>
              <View pointerEvents="none" style={styles.pickerBackgroundRow}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <View key={index} style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />
                ))}
              </View>
              <LinearGradient
                pointerEvents="none"
                colors={darkMode ? ['rgba(13,13,15,0)', '#4b3f18', '#6c5517', '#4b3f18', 'rgba(13,13,15,0)'] : ['rgba(255,255,255,0)', '#fff8d6', '#fff0a8', '#fff8d6', 'rgba(255,255,255,0)']}
                locations={[0, 0, 0.5, 1, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.pickerCenterBand}
              />
              <Animated.View
                pointerEvents={calendarMode === 'solar' ? 'auto' : 'none'}
                style={[
                  styles.pickerColumnsLayer,
                  {
                    opacity: calendarSwitchProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                <PickerColumn values={SOLAR_MONTHS} selected={solarMonth} onSelect={setSolarMonth} displayValue={displayCalendarValue} />
                <PickerColumn values={SOLAR_DAYS} selected={solarDay} onSelect={setSolarDay} displayValue={displayCalendarValue} />
                <PickerColumn values={SOLAR_HOURS} selected={solarHour} onSelect={setSolarHour} displayValue={displayCalendarValue} />
              </Animated.View>
              <Animated.View
                pointerEvents={calendarMode === 'lunar' ? 'auto' : 'none'}
                style={[
                  styles.pickerColumnsLayer,
                  {
                    opacity: calendarSwitchProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                <PickerColumn values={LUNAR_MONTHS} selected={lunarMonth} onSelect={setLunarMonth} displayValue={displayCalendarValue} />
                <PickerColumn values={LUNAR_DAYS} selected={lunarDay} onSelect={setLunarDay} displayValue={displayCalendarValue} />
                <PickerColumn values={LUNAR_HOURS} selected={lunarHour} onSelect={setLunarHour} displayValue={displayCalendarValue} />
              </Animated.View>
            </View>
            <View style={styles.currentDateWrap}>
              <Animated.Text
                style={[
                  styles.currentDateText,
                  {
                    color: colors.mutedText,
                    opacity: calendarSwitchProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                {solarBirthday}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.currentDateText,
                  styles.currentDateLayer,
                  {
                    opacity: calendarSwitchProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                {lunarBirthday}
              </Animated.Text>
            </View>
            <Pressable style={[styles.confirmButton, { backgroundColor: colors.inverse }]} onPress={() => setBirthdayVisible(false)}>
              <Text style={[styles.confirmButtonText, { color: colors.inverseText }]}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={avatarPickerVisible} animationType="fade" onRequestClose={() => setAvatarPickerVisible(false)}>
        <View style={[styles.avatarModalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAvatarPickerVisible(false)} />
          <View style={[styles.avatarModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.avatarModalTitle, { color: colors.text }]}>{t('profileEdit.avatarTitle')}</Text>
            <View style={[styles.avatarModalDivider, { backgroundColor: colors.divider }]} />
            <Pressable style={styles.avatarModalItem} onPress={takeAvatarPhoto}>
              <LineIcon name="camera" size={20} />
              <Text style={[styles.avatarModalText, { color: colors.text }]}>{t('profileEdit.takePhoto')}</Text>
            </Pressable>
            <View style={[styles.avatarModalDivider, { backgroundColor: colors.divider }]} />
            <Pressable style={styles.avatarModalItem} onPress={selectAvatarFromLibrary}>
              <LineIcon name="image" size={20} />
              <Text style={[styles.avatarModalText, { color: colors.text }]}>{t('profileEdit.chooseAlbum')}</Text>
            </Pressable>
            <Pressable style={[styles.avatarModalCancel, { backgroundColor: colors.control }]} onPress={() => setAvatarPickerVisible(false)}>
              <Text style={[styles.avatarModalCancelText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={deleteAccountVisible} animationType="fade" onRequestClose={closeDeleteAccountPrompt}>
        <View style={[styles.deleteModalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteAccountPrompt} />
          <Pressable style={[styles.deleteModalCard, { backgroundColor: colors.card }]} onPress={Keyboard.dismiss}>
            <View style={styles.deleteWarningIcon}>
              <LineIcon name="info" size={30} color="#c23a2b" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>{t('profileEdit.deleteAccount')}</Text>
            <View style={[styles.deleteModalDivider, { backgroundColor: colors.divider }]} />
            <Text style={styles.deleteWarningText}>
              {t('profileEdit.deleteWarning')}
            </Text>

            <View style={styles.deleteInputBlock}>
              <Text style={[styles.deleteInputLabel, { color: colors.text }]}>{t('profileEdit.deleteConfirmLabel')}</Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={t('profileEdit.deleteConfirmPlaceholder')}
                placeholderTextColor={colors.faintText}
                style={[styles.deleteInput, { backgroundColor: colors.cardMuted, color: colors.text }]}
              />
            </View>

            <View style={styles.deleteInputBlock}>
              <Text style={[styles.deleteInputLabel, { color: colors.text }]}>{t('profileEdit.deleteReason')}</Text>
              <TextInput
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder={t('profileEdit.deleteReasonPlaceholder')}
                placeholderTextColor={colors.faintText}
                multiline
                style={[styles.deleteInput, styles.deleteReasonInput, { backgroundColor: colors.cardMuted, color: colors.text }]}
              />
            </View>

            <View style={styles.deleteActions}>
              <Pressable style={[styles.deleteActionButton, styles.deleteCancelButton, { backgroundColor: colors.control }]} onPress={closeDeleteAccountPrompt}>
                <Text style={[styles.deleteCancelText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Animated.View style={[styles.deleteActionButton, styles.deleteConfirmButton, { backgroundColor: deleteConfirmButtonColor }]}>
                <Pressable
                  style={styles.deleteConfirmHitArea}
                  onPress={() => {
                    if (!deleteConfirmed) return;
                    closeDeleteAccountPrompt();
                  }}
                >
                  <Text style={styles.deleteConfirmText}>{t('profileEdit.deleteAccount')}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Pressable>
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
    elevation: 42,
  },
  backButtonText: { color: '#111', fontSize: 34, fontWeight: '500', lineHeight: 38, marginTop: -2 },
  navTitle: { position: 'absolute', top: 69, left: 88, right: 88, color: '#111', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  editButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 42,
    elevation: 42,
  },
  editButtonActive: { backgroundColor: '#000' },
  scroll: { position: 'absolute', left: 0, right: 0, top: 104, bottom: 0 },
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 26, gap: 14 },
  profileCard: { ...CARD_SHADOW, borderRadius: 24, backgroundColor: '#fff', paddingVertical: 24, alignItems: 'center', gap: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  avatarCameraBadge: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  userName: { color: '#000', fontSize: 20, fontWeight: '900' },
  infoCard: { ...CARD_SHADOW, borderRadius: 20, backgroundColor: '#fff', paddingTop: 16, overflow: 'hidden' },
  infoCardTitle: { color: '#000', fontSize: 16, fontWeight: '900', paddingHorizontal: 16, marginBottom: 8 },
  infoRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 104 },
  infoIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: '#111', fontSize: 14, fontWeight: '900' },
  infoValue: { flex: 1, color: '#666', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  editableReadonlyValue: { flex: 0, width: '100%', lineHeight: 18 },
  editableSlot: { flex: 1, minHeight: 38, position: 'relative', justifyContent: 'center' },
  editableLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center' },
  bindingValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  bindButton: { height: 22, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  bindButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  infoDivider: { height: 1, backgroundColor: '#ededed', marginLeft: 52 },
  deleteAccountButton: { height: 54, borderRadius: 18, backgroundColor: '#f8e2df', alignItems: 'center', justifyContent: 'center' },
  deleteAccountText: { color: '#c23a2b', fontSize: 15, fontWeight: '900' },
  deleteModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  deleteModalCard: { ...CARD_SHADOW, width: '100%', maxWidth: 420, borderRadius: 24, backgroundColor: '#fff', padding: 20, alignItems: 'stretch' },
  deleteWarningIcon: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f8e2df',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteModalTitle: { color: '#000', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  deleteModalDivider: { height: 1, backgroundColor: '#ededed', marginTop: 14, marginBottom: 14 },
  deleteWarningText: { color: '#c23a2b', fontSize: 13, fontWeight: '800', lineHeight: 21 },
  deleteInputBlock: { marginTop: 16, gap: 8 },
  deleteInputLabel: { color: '#111', fontSize: 13, fontWeight: '900' },
  deleteInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 14,
    color: '#111',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteReasonInput: { minHeight: 82, paddingTop: 13, textAlignVertical: 'top' },
  deleteActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  deleteActionButton: { flex: 1, height: 46, borderRadius: 14, overflow: 'hidden' },
  deleteCancelButton: { backgroundColor: '#f1f1f1', alignItems: 'center', justifyContent: 'center' },
  deleteCancelText: { color: '#111', fontSize: 14, fontWeight: '900' },
  deleteConfirmButton: {},
  deleteConfirmHitArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  inlineInput: { width: '100%', height: 38, borderRadius: 11, backgroundColor: '#f4f4f4', paddingHorizontal: 10, color: '#111', fontSize: 14, fontWeight: '800', lineHeight: 18, textAlign: 'right' },
  genderSelect: { width: '100%', height: 38, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  genderOption: { height: 30, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center' },
  genderOptionActive: { backgroundColor: '#000' },
  genderText: { color: '#555', fontSize: 12, fontWeight: '900', lineHeight: 15 },
  genderTextActive: { color: '#fff' },
  dateValueButton: { width: '100%', height: 38, borderRadius: 11, backgroundColor: '#f4f4f4', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 10 },
  dateValueText: { color: '#111', fontSize: 14, fontWeight: '800', lineHeight: 18, maxWidth: 190 },
  dateModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dateModalCard: { ...CARD_SHADOW, width: '100%', maxWidth: 420, borderRadius: 22, backgroundColor: '#fff', padding: 18, gap: 14 },
  dateModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateModalTitle: { color: '#000', fontSize: 18, fontWeight: '900' },
  dateCloseButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  dateCloseText: { color: '#111', fontSize: 22, fontWeight: '700', lineHeight: 26, marginTop: -2 },
  calendarSwitch: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 14, padding: 4, gap: 4, position: 'relative', overflow: 'hidden' },
  calendarSlider: { position: 'absolute', left: 4, top: 4, bottom: 4, width: '50%', borderRadius: 11, backgroundColor: '#dceee1' },
  calendarOption: { flex: 1, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  calendarOptionActive: {},
  calendarText: { color: '#555', fontSize: 13, fontWeight: '900' },
  calendarTextActive: { color: '#0f5f2d' },
  pickerRow: { height: PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ROWS, position: 'relative' },
  pickerBackgroundRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 0, elevation: 0 },
  pickerColumnBackground: { flex: 1, borderRadius: 14, backgroundColor: '#f5f5f5' },
  pickerColumnsLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 3, elevation: 3 },
  pickerColumnWrap: { flex: 1, overflow: 'hidden', position: 'relative' },
  pickerTextLayer: { flex: 1, zIndex: 5, elevation: 5 },
  pickerColumn: { flex: 1 },
  pickerColumnContent: { paddingVertical: PICKER_VERTICAL_PADDING },
  pickerCenterBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PICKER_VERTICAL_PADDING,
    height: PICKER_ITEM_HEIGHT,
    zIndex: 2,
    elevation: 2,
  },
  pickerOption: { height: PICKER_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pickerOptionText: { width: '100%', color: '#000', fontSize: 13, fontWeight: '900', lineHeight: 17, textAlign: 'center', includeFontPadding: false },
  currentDateWrap: { height: 18, justifyContent: 'center', position: 'relative' },
  currentDateText: { color: '#444', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center', includeFontPadding: false },
  currentDateLayer: { position: 'absolute', left: 0, right: 0, top: 0 },
  confirmButton: { height: 46, borderRadius: 14, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  avatarModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.34)', justifyContent: 'flex-end', padding: 16 },
  avatarModalCard: { ...CARD_SHADOW, borderRadius: 24, backgroundColor: '#fff', paddingTop: 18, paddingHorizontal: 14, paddingBottom: 12 },
  avatarModalTitle: { color: '#111', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  avatarModalItem: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  avatarModalText: { color: '#111', fontSize: 15, fontWeight: '900' },
  avatarModalDivider: { height: 1, backgroundColor: '#ededed' },
  avatarModalCancel: { height: 50, borderRadius: 16, backgroundColor: '#f3f3f3', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  avatarModalCancelText: { color: '#111', fontSize: 15, fontWeight: '900' },
});
