import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Keyboard, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { LineIcon } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';
import { uploadPickedAvatar } from '../services/avatarUpload';
import { DEFAULT_USER_PROFILE, getUserProfile, saveUserProfile, UserProfile } from '../storage/userProfileStore';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const GENDERS: UserProfile['gender'][] = ['男', '女', '未填写'];
type CalendarMode = 'solar' | 'lunar';
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
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);
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

function numberFromChineseUnit(value: string, unit: string) {
  const number = Number(value.replace(unit, ''));
  return Number.isFinite(number) ? number : value;
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

function formatBirthdayForSetupDisplay(value: string, language: 'zh' | 'en', t: (key: TranslationKey) => string) {
  if (language !== 'en') return value;
  const parts = value.trim().split(/\s+/);
  if (parts.length < 5) return value;
  const [mode, year, month, day, hour] = parts;
  const modeLabel = mode === '农历' ? t('profileEdit.lunar') : t('profileEdit.solar');
  return `${modeLabel} ${numberFromChineseUnit(year, '年')}, ${calendarPickerDisplayValue(month, language)} ${calendarPickerDisplayValue(day, language)} ${calendarPickerDisplayValue(hour, language)}`;
}

function genderLabel(gender: UserProfile['gender'], t: (key: TranslationKey) => string) {
  if (gender === '男') return t('profileEdit.genderMale');
  if (gender === '女') return t('profileEdit.genderFemale');
  return t('profileEdit.genderUnset');
}

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

function PickerColumn({ values, selected, onSelect, displayValue }: { values: string[]; selected: string; onSelect: (value: string) => void; displayValue: (value: string) => string }) {
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
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.pickerColumn}
        contentContainerStyle={styles.pickerColumnContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={PICKER_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
      >
        {values.map((value, index) => {
          const inputRange = [(index - 1) * PICKER_ITEM_HEIGHT, index * PICKER_ITEM_HEIGHT, (index + 1) * PICKER_ITEM_HEIGHT];
          const scale = scrollY.interpolate({ inputRange, outputRange: [0.96, 1.08, 0.96], extrapolate: 'clamp' });
          const itemOpacity = scrollY.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });
          return (
            <Pressable key={value} style={styles.pickerOption} onPress={() => selectByTap(value)}>
              <Animated.Text style={[styles.pickerOptionText, { color: colors.text, opacity: itemOpacity, transform: [{ scale }] }]}>{displayValue(value)}</Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

function AnimatedPressable({
  children,
  disabled,
  style,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  style?: any;
  onPress?: () => void;
}) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  const animatePress = (pressed: boolean) => {
    Animated.spring(pressProgress, {
      toValue: pressed ? 1 : 0,
      speed: 28,
      bounciness: 5,
      useNativeDriver: false,
    }).start();
  };
  return (
    <AnimatedPressableBase
      disabled={disabled}
      style={[
        style,
        {
        transform: [{
          scale: pressProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.965],
          }),
        }],
        },
      ]}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      onPress={onPress}
    >
      {children}
    </AnimatedPressableBase>
  );
}

function AnimatedGenderOption({
  label,
  active,
  activeBackground,
  inactiveBackground,
  activeText,
  inactiveText,
  onPress,
  displayLabel,
}: {
  label: UserProfile['gender'];
  active: boolean;
  activeBackground: string;
  inactiveBackground: string;
  activeText: string;
  inactiveText: string;
  onPress: () => void;
  displayLabel: string;
}) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  return (
    <AnimatedPressable
      style={[
        styles.genderPill,
        {
          backgroundColor: activeProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveBackground, activeBackground],
          }),
        },
      ]}
      onPress={onPress}
    >
      <Animated.Text
        style={[
          styles.genderText,
          {
            color: activeProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [inactiveText, activeText],
            }),
          },
        ]}
      >
        {displayLabel}
      </Animated.Text>
    </AnimatedPressable>
  );
}

function AnimatedPrimaryButton({
  ready,
  activeBackground,
  inactiveBackground,
  activeText,
  inactiveText,
  onPress,
  text,
}: {
  ready: boolean;
  activeBackground: string;
  inactiveBackground: string;
  activeText: string;
  inactiveText: string;
  onPress: () => void;
  text: string;
}) {
  const readyProgress = useRef(new Animated.Value(ready ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(readyProgress, {
      toValue: ready ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ready, readyProgress]);

  return (
    <AnimatedPressable
      disabled={!ready}
      style={[
        styles.primaryButton,
        {
          backgroundColor: readyProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveBackground, activeBackground],
          }),
        },
        !ready ? styles.primaryButtonDisabled : null,
      ]}
      onPress={onPress}
    >
      <Animated.Text
        style={[
          styles.primaryButtonText,
          {
            color: readyProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [inactiveText, activeText],
            }),
          },
        ]}
      >
        {text}
      </Animated.Text>
    </AnimatedPressable>
  );
}

export function ProfileSetupScreen({ navigation, route }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const fresh = Boolean(route.params?.fresh);
  const fade = useRef(new Animated.Value(0)).current;
  const leavingRef = useRef(false);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('未填写');
  const [birthday, setBirthday] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [birthdayVisible, setBirthdayVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('solar');
  const calendarSwitchProgress = useRef(new Animated.Value(0)).current;
  const [calendarSwitchWidth, setCalendarSwitchWidth] = useState(0);
  const [year, setYear] = useState('2026年');
  const [solarMonth, setSolarMonth] = useState('3月');
  const [solarDay, setSolarDay] = useState('5日');
  const [lunarMonth, setLunarMonth] = useState('二月');
  const [lunarDay, setLunarDay] = useState('十五');
  const [solarHour, setSolarHour] = useState('12时');
  const [lunarHour, setLunarHour] = useState('子时');
  const month = calendarMode === 'solar' ? solarMonth : lunarMonth;
  const day = calendarMode === 'solar' ? solarDay : lunarDay;
  const hour = calendarMode === 'solar' ? solarHour : lunarHour;
  const selectedBirthday = `${calendarMode === 'solar' ? '公历' : '农历'} ${year} ${month} ${day} ${hour}`;
  const displayCalendarValue = (value: string) => calendarPickerDisplayValue(value, language);
  const profileReady = nickname.trim().length > 0 && gender !== '未填写' && birthday.trim().length > 0;

  useEffect(() => {
    if (!fresh) {
      getUserProfile().then((profile) => {
        setNickname(profile.nickname === '未命名用户' ? '' : profile.nickname);
        setGender(profile.gender);
        setBirthday(profile.birthday === '未填写' ? '' : profile.birthday);
        setAvatarUri(profile.avatarUri);
        if (profile.birthday !== '未填写') {
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
        }
      });
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, fresh]);

  useEffect(() => {
    Animated.timing(calendarSwitchProgress, {
      toValue: calendarMode === 'solar' ? 0 : 1,
      duration: 320,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [calendarMode, calendarSwitchProgress]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('setup.albumDeniedTitle'), t('setup.albumDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setAvatarUploading(true);
      try {
        const avatarUrl = await uploadPickedAvatar(result.assets[0]);
        if (avatarUrl) setAvatarUri(avatarUrl);
      } catch (error) {
        Alert.alert(t('setup.avatarSaveFailedTitle'), t('setup.avatarSaveFailedBody'));
        console.warn('Avatar upload failed.', error);
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const leaveToQuestion = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => navigation.replace('Question'));
  };

  const completeSetup = async (skip = false) => {
    if (skip) {
      await saveUserProfile(DEFAULT_USER_PROFILE);
      leaveToQuestion();
      return;
    }
    if (!profileReady) {
      Alert.alert(t('setup.completeAlertTitle'), t('setup.completeAlertBody'));
      return;
    }
    const nextProfile: UserProfile = {
      nickname: nickname.trim(),
      gender,
      birthday: birthday.trim(),
      avatarUri,
    };
    await saveUserProfile(nextProfile);
    leaveToQuestion();
  };

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <LinearGradient
          pointerEvents="none"
          colors={darkMode ? ['rgba(51, 82, 58, 0.34)', 'rgba(13,13,15,0)'] : ['rgba(219, 239, 224, 0.95)', 'rgba(243,243,243,0)']}
          style={styles.topGlow}
        />
        <Animated.View
          style={[
            styles.content,
            { opacity: fade },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('setup.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.faintText }]}>{t('setup.subtitle')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <AnimatedPressable style={[styles.avatar, { backgroundColor: darkMode ? '#222b24' : '#e8f4eb' }]} onPress={pickAvatar} disabled={avatarUploading}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: darkMode ? '#dff3e4' : '#173d22' }]}>{(nickname.trim().slice(0, 1) || '问').toUpperCase()}</Text>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.inverse, borderColor: colors.card }]}>
                <LineIcon name="camera" size={13} color={colors.inverseText} />
              </View>
              {avatarUploading ? <Text style={styles.avatarUploadingText}>{t('setup.uploading')}</Text> : null}
            </AnimatedPressable>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: colors.mutedText }]}>{t('setup.nickname')}</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.cardMuted }]}>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder={t('setup.nicknamePlaceholder')}
                  placeholderTextColor={colors.faintText}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: colors.mutedText }]}>{t('setup.gender')}</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((item) => {
                  const active = gender === item;
                  return (
                    <AnimatedGenderOption
                      key={item}
                      label={item}
                      active={active}
                      activeBackground={colors.inverse}
                      inactiveBackground={colors.cardMuted}
                      activeText={colors.inverseText}
                      inactiveText={colors.mutedText}
                      displayLabel={genderLabel(item, t)}
                      onPress={() => setGender(item)}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: colors.mutedText }]}>{t('setup.birthday')}</Text>
              <AnimatedPressable style={[styles.dateValueButton, { backgroundColor: colors.cardMuted }]} onPress={() => setBirthdayVisible(true)}>
                <Text numberOfLines={1} style={[styles.dateValueText, { color: birthday ? colors.text : colors.faintText }]}>{birthday ? formatBirthdayForSetupDisplay(birthday, language, t) : t('setup.birthdayPlaceholder')}</Text>
                <LineIcon name="calendar" size={17} color={colors.faintText} />
              </AnimatedPressable>
            </View>

            <AnimatedPrimaryButton
              ready={profileReady}
              activeBackground={colors.inverse}
              inactiveBackground={colors.cardMuted}
              activeText={colors.inverseText}
              inactiveText={colors.faintText}
              text={t('common.done')}
              onPress={() => completeSetup(false)}
            />
            <AnimatedPressable style={styles.skipButton} onPress={() => completeSetup(true)}>
              <Text style={[styles.skipText, { color: colors.faintText }]}>{t('setup.later')}</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
        <Modal transparent visible={birthdayVisible} animationType="fade" onRequestClose={() => setBirthdayVisible(false)}>
          <View style={[styles.dateModalBackdrop, { backgroundColor: colors.overlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setBirthdayVisible(false)} />
            <View style={[styles.dateModalCard, { backgroundColor: colors.card }]}>
              <View style={styles.dateModalHeader}>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>{t('setup.chooseBirthday')}</Text>
                <AnimatedPressable style={[styles.dateCloseButton, { backgroundColor: colors.control }]} onPress={() => setBirthdayVisible(false)}>
                  <Text style={[styles.dateCloseText, { color: colors.text }]}>×</Text>
                </AnimatedPressable>
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
                  <AnimatedPressable key={mode} style={styles.calendarOption} onPress={() => setCalendarMode(mode)}>
                    <Text style={[styles.calendarText, { color: calendarMode === mode ? '#0f5f2d' : colors.mutedText }]}>{mode === 'solar' ? t('profileEdit.solar') : t('profileEdit.lunar')}</Text>
                  </AnimatedPressable>
                ))}
              </View>
              <View style={styles.pickerRow}>
                <View pointerEvents="none" style={styles.pickerBackgroundRow}>
                  {Array.from({ length: 4 }).map((_, index) => <View key={index} style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />)}
                </View>
                <LinearGradient
                  pointerEvents="none"
                  colors={darkMode ? ['rgba(13,13,15,0)', '#4b3f18', '#6c5517', '#4b3f18', 'rgba(13,13,15,0)'] : ['rgba(255,255,255,0)', '#fff8d6', '#fff0a8', '#fff8d6', 'rgba(255,255,255,0)']}
                  locations={[0, 0, 0.5, 1, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.pickerCenterBand}
                />
                <Animated.View pointerEvents={calendarMode === 'solar' ? 'auto' : 'none'} style={[styles.pickerColumnsLayer, { opacity: calendarSwitchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                  <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                  <PickerColumn values={SOLAR_MONTHS} selected={solarMonth} onSelect={setSolarMonth} displayValue={displayCalendarValue} />
                  <PickerColumn values={SOLAR_DAYS} selected={solarDay} onSelect={setSolarDay} displayValue={displayCalendarValue} />
                  <PickerColumn values={SOLAR_HOURS} selected={solarHour} onSelect={setSolarHour} displayValue={displayCalendarValue} />
                </Animated.View>
                <Animated.View pointerEvents={calendarMode === 'lunar' ? 'auto' : 'none'} style={[styles.pickerColumnsLayer, { opacity: calendarSwitchProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                  <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                  <PickerColumn values={LUNAR_MONTHS} selected={lunarMonth} onSelect={setLunarMonth} displayValue={displayCalendarValue} />
                  <PickerColumn values={LUNAR_DAYS} selected={lunarDay} onSelect={setLunarDay} displayValue={displayCalendarValue} />
                  <PickerColumn values={LUNAR_HOURS} selected={lunarHour} onSelect={setLunarHour} displayValue={displayCalendarValue} />
                </Animated.View>
              </View>
              <Text style={[styles.currentDateText, { color: colors.mutedText }]}>{formatBirthdayForSetupDisplay(selectedBirthday, language, t)}</Text>
              <AnimatedPressable
                style={[styles.confirmButton, { backgroundColor: colors.inverse }]}
                onPress={() => {
                  setBirthday(selectedBirthday);
                  setBirthdayVisible(false);
                }}
              >
                <Text style={[styles.confirmButtonText, { color: colors.inverseText }]}>{t('common.confirm')}</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 92, paddingBottom: 34, justifyContent: 'space-between' },
  header: { gap: 8 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  subtitle: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  card: { borderRadius: 30, padding: 18, gap: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  avatar: { alignSelf: 'center', width: 94, height: 94, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative' },
  avatarImage: { width: 94, height: 94, borderRadius: 34 },
  avatarText: { fontSize: 42, fontWeight: '900' },
  avatarUploadingText: { position: 'absolute', left: 0, right: 0, bottom: 20, color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fieldBlock: { gap: 8 },
  label: { fontSize: 12, fontWeight: '900', marginLeft: 4 },
  inputWrap: { height: 52, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center' },
  input: { height: 52, fontSize: 15, fontWeight: '800' },
  dateValueButton: { height: 52, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateValueText: { flex: 1, fontSize: 15, fontWeight: '800' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderPill: { flex: 1, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  genderText: { fontSize: 14, fontWeight: '900' },
  primaryButton: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonDisabled: { opacity: 0.72 },
  primaryButtonText: { fontSize: 15, fontWeight: '900' },
  skipButton: { alignSelf: 'center', paddingVertical: 2 },
  skipText: { fontSize: 13, fontWeight: '800' },
  dateModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dateModalCard: { width: '100%', maxWidth: 420, borderRadius: 22, padding: 18, gap: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  dateModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateModalTitle: { fontSize: 18, fontWeight: '900' },
  dateCloseButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dateCloseText: { fontSize: 22, fontWeight: '700', lineHeight: 26, marginTop: -2 },
  calendarSwitch: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, position: 'relative', overflow: 'hidden' },
  calendarSlider: { position: 'absolute', left: 4, top: 4, bottom: 4, width: '50%', borderRadius: 11, backgroundColor: '#dceee1' },
  calendarOption: { flex: 1, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  calendarText: { fontSize: 13, fontWeight: '900' },
  pickerRow: { height: PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ROWS, position: 'relative' },
  pickerBackgroundRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 0, elevation: 0 },
  pickerColumnBackground: { flex: 1, borderRadius: 14 },
  pickerColumnsLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 3, elevation: 3 },
  pickerColumnWrap: { flex: 1, overflow: 'hidden', position: 'relative' },
  pickerColumn: { flex: 1 },
  pickerColumnContent: { paddingVertical: PICKER_VERTICAL_PADDING },
  pickerCenterBand: { position: 'absolute', left: 0, right: 0, top: PICKER_VERTICAL_PADDING, height: PICKER_ITEM_HEIGHT, zIndex: 2, elevation: 2 },
  pickerOption: { height: PICKER_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pickerOptionText: { width: '100%', fontSize: 13, fontWeight: '900', lineHeight: 17, textAlign: 'center', includeFontPadding: false },
  currentDateText: { fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center', includeFontPadding: false },
  confirmButton: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { fontSize: 15, fontWeight: '900' },
});
